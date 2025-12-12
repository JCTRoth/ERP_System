package com.erp.edifact.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.smooks.Smooks;
import org.smooks.api.ExecutionContext;
import org.smooks.api.SmooksException;
import org.smooks.io.payload.StringResult;
import org.springframework.stereotype.Component;

import javax.xml.transform.stream.StreamSource;
import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class EdifactParser {
    
    private final ObjectMapper objectMapper;
    
    // Pattern to extract message type from EDIFACT
    private static final Pattern MESSAGE_TYPE_PATTERN = Pattern.compile("UNH\\+[^+]+\\+([A-Z]+):");
    private static final Pattern VERSION_PATTERN = Pattern.compile("UNH\\+[^+]+\\+[A-Z]+:([A-Z0-9]+):");
    private static final Pattern INTERCHANGE_REF_PATTERN = Pattern.compile("UNB\\+[^+]+\\+[^+]+\\+[^+]+\\+[^+]+\\+([^+']+)");
    private static final Pattern MESSAGE_REF_PATTERN = Pattern.compile("UNH\\+([^+]+)\\+");
    private static final Pattern SENDER_PATTERN = Pattern.compile("UNB\\+[^+]+\\+([^:+]+)");
    private static final Pattern RECIPIENT_PATTERN = Pattern.compile("UNB\\+[^+]+\\+[^+]+\\+([^:+]+)");
    
    public ParseResult parse(String edifactContent, String smooksConfig) {
        try {
            // Extract metadata from EDIFACT
            String messageType = extractPattern(edifactContent, MESSAGE_TYPE_PATTERN);
            String version = extractPattern(edifactContent, VERSION_PATTERN);
            String interchangeRef = extractPattern(edifactContent, INTERCHANGE_REF_PATTERN);
            String messageRef = extractPattern(edifactContent, MESSAGE_REF_PATTERN);
            String senderId = extractPattern(edifactContent, SENDER_PATTERN);
            String recipientId = extractPattern(edifactContent, RECIPIENT_PATTERN);
            
            // Parse using Smooks if config provided
            Map<String, Object> parsedData = new HashMap<>();
            
            if (smooksConfig != null && !smooksConfig.isBlank()) {
                parsedData = parseWithSmooks(edifactContent, smooksConfig);
            } else {
                // Basic parsing without Smooks config
                parsedData = parseBasic(edifactContent);
            }
            
            return ParseResult.success(
                    messageType,
                    version,
                    interchangeRef,
                    messageRef,
                    senderId,
                    recipientId,
                    objectMapper.writeValueAsString(parsedData)
            );
            
        } catch (Exception e) {
            log.error("Failed to parse EDIFACT message", e);
            return ParseResult.error(e.getMessage());
        }
    }
    
    private Map<String, Object> parseWithSmooks(String edifactContent, String smooksConfig) throws Exception {
        Smooks smooks = new Smooks(new ByteArrayInputStream(smooksConfig.getBytes(StandardCharsets.UTF_8)));
        
        try {
            ExecutionContext executionContext = smooks.createExecutionContext();
            StringResult result = new StringResult();
            
            smooks.filterSource(
                    executionContext,
                    new StreamSource(new StringReader(edifactContent)),
                    result
            );
            
            // Parse XML result to Map
            return objectMapper.readValue(result.toString(), Map.class);
            
        } finally {
            smooks.close();
        }
    }
    
    private Map<String, Object> parseBasic(String edifactContent) {
        Map<String, Object> result = new HashMap<>();
        
        // Split into segments
        String[] segments = edifactContent.split("'");
        
        for (String segment : segments) {
            segment = segment.trim();
            if (segment.isEmpty()) continue;
            
            String[] parts = segment.split("\\+");
            if (parts.length > 0) {
                String segmentType = parts[0];
                
                // Handle common segment types
                switch (segmentType) {
                    case "UNB" -> result.put("interchange", parseUNB(parts));
                    case "UNH" -> result.put("messageHeader", parseUNH(parts));
                    case "BGM" -> result.put("beginningOfMessage", parseBGM(parts));
                    case "DTM" -> addToList(result, "dates", parseDTM(parts));
                    case "NAD" -> addToList(result, "parties", parseNAD(parts));
                    case "LIN" -> addToList(result, "lineItems", parseLIN(parts));
                    case "PRI" -> addToList(result, "prices", parsePRI(parts));
                    case "QTY" -> addToList(result, "quantities", parseQTY(parts));
                }
            }
        }
        
        return result;
    }
    
    private Map<String, Object> parseUNB(String[] parts) {
        Map<String, Object> unb = new HashMap<>();
        if (parts.length > 1) unb.put("syntaxIdentifier", parts[1]);
        if (parts.length > 2) unb.put("sender", parts[2]);
        if (parts.length > 3) unb.put("recipient", parts[3]);
        if (parts.length > 4) unb.put("dateTime", parts[4]);
        if (parts.length > 5) unb.put("controlRef", parts[5]);
        return unb;
    }
    
    private Map<String, Object> parseUNH(String[] parts) {
        Map<String, Object> unh = new HashMap<>();
        if (parts.length > 1) unh.put("messageRef", parts[1]);
        if (parts.length > 2) {
            String[] msgId = parts[2].split(":");
            if (msgId.length > 0) unh.put("messageType", msgId[0]);
            if (msgId.length > 1) unh.put("version", msgId[1]);
            if (msgId.length > 2) unh.put("release", msgId[2]);
            if (msgId.length > 3) unh.put("controllingAgency", msgId[3]);
        }
        return unh;
    }
    
    private Map<String, Object> parseBGM(String[] parts) {
        Map<String, Object> bgm = new HashMap<>();
        if (parts.length > 1) bgm.put("documentName", parts[1]);
        if (parts.length > 2) bgm.put("documentNumber", parts[2]);
        if (parts.length > 3) bgm.put("messageFunctionCode", parts[3]);
        return bgm;
    }
    
    private Map<String, Object> parseDTM(String[] parts) {
        Map<String, Object> dtm = new HashMap<>();
        if (parts.length > 1) {
            String[] dateInfo = parts[1].split(":");
            if (dateInfo.length > 0) dtm.put("qualifier", dateInfo[0]);
            if (dateInfo.length > 1) dtm.put("value", dateInfo[1]);
            if (dateInfo.length > 2) dtm.put("format", dateInfo[2]);
        }
        return dtm;
    }
    
    private Map<String, Object> parseNAD(String[] parts) {
        Map<String, Object> nad = new HashMap<>();
        if (parts.length > 1) nad.put("qualifier", parts[1]);  // BY=Buyer, SE=Seller, etc.
        if (parts.length > 2) nad.put("partyId", parts[2]);
        if (parts.length > 4) nad.put("name", parts[4]);
        if (parts.length > 5) nad.put("address", parts[5]);
        if (parts.length > 6) nad.put("city", parts[6]);
        if (parts.length > 8) nad.put("postalCode", parts[8]);
        if (parts.length > 9) nad.put("country", parts[9]);
        return nad;
    }
    
    private Map<String, Object> parseLIN(String[] parts) {
        Map<String, Object> lin = new HashMap<>();
        if (parts.length > 1) lin.put("lineNumber", parts[1]);
        if (parts.length > 2) lin.put("actionCode", parts[2]);
        if (parts.length > 3) {
            String[] itemId = parts[3].split(":");
            if (itemId.length > 0) lin.put("itemNumber", itemId[0]);
            if (itemId.length > 1) lin.put("itemNumberType", itemId[1]);
        }
        return lin;
    }
    
    private Map<String, Object> parsePRI(String[] parts) {
        Map<String, Object> pri = new HashMap<>();
        if (parts.length > 1) {
            String[] priceInfo = parts[1].split(":");
            if (priceInfo.length > 0) pri.put("qualifier", priceInfo[0]);
            if (priceInfo.length > 1) pri.put("amount", priceInfo[1]);
            if (priceInfo.length > 2) pri.put("type", priceInfo[2]);
        }
        return pri;
    }
    
    private Map<String, Object> parseQTY(String[] parts) {
        Map<String, Object> qty = new HashMap<>();
        if (parts.length > 1) {
            String[] qtyInfo = parts[1].split(":");
            if (qtyInfo.length > 0) qty.put("qualifier", qtyInfo[0]);
            if (qtyInfo.length > 1) qty.put("quantity", qtyInfo[1]);
            if (qtyInfo.length > 2) qty.put("unit", qtyInfo[2]);
        }
        return qty;
    }
    
    @SuppressWarnings("unchecked")
    private void addToList(Map<String, Object> result, String key, Map<String, Object> value) {
        if (!result.containsKey(key)) {
            result.put(key, new java.util.ArrayList<Map<String, Object>>());
        }
        ((java.util.List<Map<String, Object>>) result.get(key)).add(value);
    }
    
    private String extractPattern(String content, Pattern pattern) {
        Matcher matcher = pattern.matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }
    
    public record ParseResult(
            boolean success,
            String messageType,
            String version,
            String interchangeRef,
            String messageRef,
            String senderId,
            String recipientId,
            String parsedData,
            String error
    ) {
        public static ParseResult success(
                String messageType,
                String version,
                String interchangeRef,
                String messageRef,
                String senderId,
                String recipientId,
                String parsedData
        ) {
            return new ParseResult(true, messageType, version, interchangeRef, messageRef, senderId, recipientId, parsedData, null);
        }
        
        public static ParseResult error(String error) {
            return new ParseResult(false, null, null, null, null, null, null, null, error);
        }
    }
}
