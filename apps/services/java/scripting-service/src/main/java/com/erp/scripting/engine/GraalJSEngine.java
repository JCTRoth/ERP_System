package com.erp.scripting.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.graalvm.polyglot.*;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.*;

@Component
@Slf4j
public class GraalJSEngine {
    
    private final ObjectMapper objectMapper;
    private final ExecutorService executorService;
    
    @org.springframework.beans.factory.annotation.Value("${scripting.execution.timeout-ms:5000}")
    private long timeoutMs;
    
    @org.springframework.beans.factory.annotation.Value("${scripting.execution.max-memory-mb:64}")
    private int maxMemoryMb;
    
    @org.springframework.beans.factory.annotation.Value("${scripting.execution.max-statements:10000}")
    private int maxStatements;
    
    @org.springframework.beans.factory.annotation.Value("${scripting.execution.allow-network:false}")
    private boolean allowNetwork;
    
    @org.springframework.beans.factory.annotation.Value("${scripting.execution.allow-file-access:false}")
    private boolean allowFileAccess;
    
    public GraalJSEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.executorService = Executors.newCachedThreadPool();
    }
    
    @PreDestroy
    public void shutdown() {
        executorService.shutdown();
    }
    
    public ExecutionResult execute(String code, Map<String, Object> context) {
        long startTime = System.currentTimeMillis();
        
        Future<ExecutionResult> future = executorService.submit(() -> executeInSandbox(code, context));
        
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            return ExecutionResult.timeout(System.currentTimeMillis() - startTime);
        } catch (ExecutionException e) {
            return ExecutionResult.error(
                    e.getCause().getMessage(),
                    System.currentTimeMillis() - startTime
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ExecutionResult.error("Execution interrupted", System.currentTimeMillis() - startTime);
        }
    }
    
    private ExecutionResult executeInSandbox(String code, Map<String, Object> context) {
        long startTime = System.currentTimeMillis();
        
        // Create sandboxed context with resource limits
        try (Context graalContext = Context.newBuilder("js")
                .allowHostAccess(HostAccess.SCOPED)
                .allowHostClassLookup(className -> false)  // No Java class access
                .allowAllAccess(false)  // Explicitly disable all access, then selectively enable
                .allowNativeAccess(false)
                .allowCreateThread(false)
                .allowCreateProcess(false)
                .allowEnvironmentAccess(EnvironmentAccess.NONE)
                .option("js.ecmascript-version", "2022")
                .option("engine.WarnInterpreterOnly", "false")
                .resourceLimits(ResourceLimits.newBuilder()
                        .statementLimit(maxStatements, null)
                        .build())
                .build()) {
            
            // Create sandbox bindings
            Value bindings = graalContext.getBindings("js");
            
            // Add context data
            if (context != null) {
                for (Map.Entry<String, Object> entry : context.entrySet()) {
                    bindings.putMember(entry.getKey(), convertToGraalValue(graalContext, entry.getValue()));
                }
            }
            
            // Add safe utility functions
            addUtilityFunctions(graalContext, bindings);
            
            // Wrap code to capture return value
            String wrappedCode = wrapCode(code);
            
            // Execute
            Value result = graalContext.eval("js", wrappedCode);
            
            // Convert result back to Java
            Object javaResult = convertFromGraalValue(result);
            
            long executionTime = System.currentTimeMillis() - startTime;
            return ExecutionResult.success(javaResult, executionTime);
            
        } catch (PolyglotException e) {
            log.error("Script execution failed", e);
            long executionTime = System.currentTimeMillis() - startTime;
            
            if (e.isResourceExhausted()) {
                return ExecutionResult.timeout(executionTime);
            }
            
            return ExecutionResult.error(sanitizeErrorMessage(e.getMessage()), executionTime);
        } catch (Exception e) {
            log.error("Script execution error", e);
            return ExecutionResult.error(e.getMessage(), System.currentTimeMillis() - startTime);
        }
    }
    
    private Value convertToGraalValue(Context context, Object value) {
        if (value == null) {
            return context.asValue(null);
        }
        if (value instanceof Map || value instanceof java.util.List) {
            try {
                String json = objectMapper.writeValueAsString(value);
                return context.eval("js", "(" + json + ")");
            } catch (JsonProcessingException e) {
                return context.asValue(value.toString());
            }
        }
        return context.asValue(value);
    }
    
    private Object convertFromGraalValue(Value value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isNumber()) {
            if (value.fitsInInt()) {
                return value.asInt();
            }
            if (value.fitsInLong()) {
                return value.asLong();
            }
            return value.asDouble();
        }
        if (value.isString()) {
            return value.asString();
        }
        if (value.hasArrayElements()) {
            int size = (int) value.getArraySize();
            java.util.List<Object> list = new java.util.ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                list.add(convertFromGraalValue(value.getArrayElement(i)));
            }
            return list;
        }
        if (value.hasMembers()) {
            Map<String, Object> map = new java.util.HashMap<>();
            for (String key : value.getMemberKeys()) {
                map.put(key, convertFromGraalValue(value.getMember(key)));
            }
            return map;
        }
        return value.toString();
    }
    
    private void addUtilityFunctions(Context context, Value bindings) {
        // Add console.log that captures output
        StringBuilder logOutput = new StringBuilder();
        context.eval("js", """
            var console = {
                log: function(...args) { _log(args.map(String).join(' ')); },
                warn: function(...args) { _log('[WARN] ' + args.map(String).join(' ')); },
                error: function(...args) { _log('[ERROR] ' + args.map(String).join(' ')); }
            };
            """);
        bindings.putMember("_log", (java.util.function.Consumer<String>) msg -> {
            logOutput.append(msg).append("\n");
            log.debug("Script log: {}", msg);
        });
        
        // Add safe JSON utilities
        context.eval("js", """
            var ERP = {
                // Safe math utilities
                round: function(num, decimals) { return Math.round(num * Math.pow(10, decimals || 0)) / Math.pow(10, decimals || 0); },
                clamp: function(num, min, max) { return Math.min(Math.max(num, min), max); },
                
                // String utilities
                slugify: function(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); },
                
                // Array utilities
                sum: function(arr) { return arr.reduce((a, b) => a + b, 0); },
                avg: function(arr) { return arr.length ? ERP.sum(arr) / arr.length : 0; },
                unique: function(arr) { return [...new Set(arr)]; },
                groupBy: function(arr, key) { return arr.reduce((acc, item) => { (acc[item[key]] = acc[item[key]] || []).push(item); return acc; }, {}); },
                
                // Validation
                isEmail: function(str) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(str); },
                isUUID: function(str) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str); },
                
                // Date utilities (limited)
                now: function() { return Date.now(); },
                formatDate: function(timestamp) { return new Date(timestamp).toISOString(); }
            };
            """);
    }
    
    private String wrapCode(String code) {
        // Wrap code in an IIFE to capture return value
        return "(function() { " + code + " })()";
    }
    
    private String sanitizeErrorMessage(String message) {
        // Remove potentially sensitive information from error messages
        if (message == null) return "Unknown error";
        return message
                .replaceAll("at <js>.*", "")
                .replaceAll("\\(.*\\.java:\\d+\\)", "")
                .trim();
    }
    
    public record ExecutionResult(
            boolean success,
            Object result,
            String error,
            long executionTimeMs,
            boolean timeout
    ) {
        public static ExecutionResult success(Object result, long executionTimeMs) {
            return new ExecutionResult(true, result, null, executionTimeMs, false);
        }
        
        public static ExecutionResult error(String error, long executionTimeMs) {
            return new ExecutionResult(false, null, error, executionTimeMs, false);
        }
        
        public static ExecutionResult timeout(long executionTimeMs) {
            return new ExecutionResult(false, null, "Script execution timed out", executionTimeMs, true);
        }
    }
}
