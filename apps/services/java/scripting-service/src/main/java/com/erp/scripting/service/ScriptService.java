package com.erp.scripting.service;

import com.erp.scripting.engine.GraalJSEngine;
import com.erp.scripting.entity.Script;
import com.erp.scripting.entity.Script.ScriptType;
import com.erp.scripting.entity.Script.TriggerEvent;
import com.erp.scripting.entity.ScriptExecution;
import com.erp.scripting.entity.ScriptExecution.ExecutionStatus;
import com.erp.scripting.repository.ScriptExecutionRepository;
import com.erp.scripting.repository.ScriptRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScriptService {
    
    private final ScriptRepository scriptRepository;
    private final ScriptExecutionRepository executionRepository;
    private final GraalJSEngine jsEngine;
    private final ObjectMapper objectMapper;
    
    public List<Script> findByCompany(UUID companyId) {
        return scriptRepository.findByCompanyId(companyId);
    }
    
    public List<Script> findActiveByCompany(UUID companyId) {
        return scriptRepository.findByCompanyIdAndIsActiveTrue(companyId);
    }
    
    public Optional<Script> findById(UUID id) {
        return scriptRepository.findById(id);
    }
    
    public List<Script> findByTrigger(UUID companyId, TriggerEvent event, String entity) {
        return scriptRepository.findActiveByTrigger(companyId, event, entity);
    }
    
    @Transactional
    public Script create(CreateScriptRequest request) {
        log.info("Creating script: {} for company: {}", request.name(), request.companyId());
        
        Script script = Script.builder()
                .companyId(request.companyId())
                .name(request.name())
                .description(request.description())
                .code(request.code())
                .type(request.type())
                .triggerEvent(request.triggerEvent())
                .triggerEntity(request.triggerEntity())
                .isActive(request.isActive())
                .createdBy(request.createdBy())
                .build();
        
        return scriptRepository.save(script);
    }
    
    @Transactional
    public Optional<Script> update(UUID id, UpdateScriptRequest request) {
        return scriptRepository.findById(id).map(script -> {
            if (request.name() != null) {
                script.setName(request.name());
            }
            if (request.description() != null) {
                script.setDescription(request.description());
            }
            if (request.code() != null) {
                script.setCode(request.code());
            }
            if (request.type() != null) {
                script.setType(request.type());
            }
            if (request.triggerEvent() != null) {
                script.setTriggerEvent(request.triggerEvent());
            }
            if (request.triggerEntity() != null) {
                script.setTriggerEntity(request.triggerEntity());
            }
            if (request.isActive() != null) {
                script.setActive(request.isActive());
            }
            script.setUpdatedBy(request.updatedBy());
            return scriptRepository.save(script);
        });
    }
    
    @Transactional
    public boolean delete(UUID id) {
        if (scriptRepository.existsById(id)) {
            scriptRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    @Transactional
    public ScriptExecutionResult execute(UUID scriptId, Map<String, Object> input, UUID executedBy) {
        Script script = scriptRepository.findById(scriptId)
                .orElseThrow(() -> new IllegalArgumentException("Script not found: " + scriptId));
        
        return executeScript(script, input, executedBy);
    }
    
    @Transactional
    public ScriptExecutionResult executeScript(Script script, Map<String, Object> input, UUID executedBy) {
        log.info("Executing script: {} ({})", script.getName(), script.getId());
        
        // Create execution record
        ScriptExecution execution = ScriptExecution.builder()
                .scriptId(script.getId())
                .companyId(script.getCompanyId())
                .executedBy(executedBy)
                .inputData(serializeJson(input))
                .status(ExecutionStatus.RUNNING)
                .build();
        execution = executionRepository.save(execution);
        
        // Execute in sandbox
        GraalJSEngine.ExecutionResult result = jsEngine.execute(script.getCode(), input);
        
        // Update execution record
        execution.setCompletedAt(OffsetDateTime.now());
        execution.setExecutionTimeMs(result.executionTimeMs());
        
        if (result.success()) {
            execution.setStatus(ExecutionStatus.SUCCESS);
            execution.setOutputData(serializeJson(result.result()));
        } else if (result.timeout()) {
            execution.setStatus(ExecutionStatus.TIMEOUT);
            execution.setErrorMessage(result.error());
        } else {
            execution.setStatus(ExecutionStatus.FAILED);
            execution.setErrorMessage(result.error());
        }
        
        executionRepository.save(execution);
        
        return new ScriptExecutionResult(
                execution.getId(),
                result.success(),
                result.result(),
                result.error(),
                result.executionTimeMs()
        );
    }
    
    @Transactional
    public List<ScriptExecutionResult> executeTrigger(
            UUID companyId,
            TriggerEvent event,
            String entity,
            Map<String, Object> data,
            UUID executedBy
    ) {
        List<Script> scripts = scriptRepository.findActiveByTrigger(companyId, event, entity);
        
        return scripts.stream()
                .map(script -> executeScript(script, data, executedBy))
                .toList();
    }
    
    public Page<ScriptExecution> getExecutionHistory(UUID scriptId, Pageable pageable) {
        return executionRepository.findByScriptId(scriptId, pageable);
    }
    
    public ScriptStats getStats(UUID scriptId) {
        long successCount = executionRepository.countByScriptIdAndStatus(scriptId, ExecutionStatus.SUCCESS);
        long failedCount = executionRepository.countByScriptIdAndStatus(scriptId, ExecutionStatus.FAILED);
        long timeoutCount = executionRepository.countByScriptIdAndStatus(scriptId, ExecutionStatus.TIMEOUT);
        Double avgTime = executionRepository.getAverageExecutionTime(scriptId);
        
        return new ScriptStats(successCount, failedCount, timeoutCount, avgTime != null ? avgTime : 0.0);
    }
    
    private String serializeJson(Object data) {
        if (data == null) return null;
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize data", e);
            return null;
        }
    }
    
    public record CreateScriptRequest(
            UUID companyId,
            String name,
            String description,
            String code,
            ScriptType type,
            TriggerEvent triggerEvent,
            String triggerEntity,
            boolean isActive,
            UUID createdBy
    ) {}
    
    public record UpdateScriptRequest(
            String name,
            String description,
            String code,
            ScriptType type,
            TriggerEvent triggerEvent,
            String triggerEntity,
            Boolean isActive,
            UUID updatedBy
    ) {}
    
    public record ScriptExecutionResult(
            UUID executionId,
            boolean success,
            Object result,
            String error,
            long executionTimeMs
    ) {}
    
    public record ScriptStats(
            long successCount,
            long failedCount,
            long timeoutCount,
            double averageExecutionTimeMs
    ) {}
}
