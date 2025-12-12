package com.erp.edifact.service;

import com.erp.edifact.entity.EdifactMapping;
import com.erp.edifact.entity.EdifactMessage;
import com.erp.edifact.entity.EdifactMessage.Direction;
import com.erp.edifact.entity.EdifactMessage.ProcessingStatus;
import com.erp.edifact.parser.EdifactParser;
import com.erp.edifact.repository.EdifactMappingRepository;
import com.erp.edifact.repository.EdifactMessageRepository;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EdifactService {
    
    private final EdifactMessageRepository messageRepository;
    private final EdifactMappingRepository mappingRepository;
    private final EdifactParser parser;
    private final MinioClient minioClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Value("${minio.bucket}")
    private String bucketName;
    
    @PostConstruct
    public void initBucket() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Created MinIO bucket: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("Failed to initialize MinIO bucket", e);
        }
    }
    
    @Transactional
    public EdifactMessage processInbound(UUID companyId, MultipartFile file, UUID createdBy) throws Exception {
        log.info("Processing inbound EDIFACT file: {} for company: {}", file.getOriginalFilename(), companyId);
        
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        
        // Store file in MinIO
        String filePath = String.format("%s/inbound/%s/%s", 
                companyId, OffsetDateTime.now().toLocalDate(), UUID.randomUUID() + "_" + file.getOriginalFilename());
        
        minioClient.putObject(PutObjectArgs.builder()
                .bucket(bucketName)
                .object(filePath)
                .stream(new ByteArrayInputStream(file.getBytes()), file.getSize(), -1)
                .contentType("application/edifact")
                .build());
        
        // Parse EDIFACT
        String smooksConfig = findSmooksConfig(content, companyId);
        EdifactParser.ParseResult parseResult = parser.parse(content, smooksConfig);
        
        // Create message record
        EdifactMessage message = EdifactMessage.builder()
                .companyId(companyId)
                .messageType(parseResult.messageType())
                .messageVersion(parseResult.version())
                .direction(Direction.INBOUND)
                .interchangeRef(parseResult.interchangeRef())
                .messageRef(parseResult.messageRef())
                .senderId(parseResult.senderId())
                .recipientId(parseResult.recipientId())
                .filePath(filePath)
                .originalFilename(file.getOriginalFilename())
                .parsedData(parseResult.parsedData())
                .status(parseResult.success() ? ProcessingStatus.COMPLETED : ProcessingStatus.FAILED)
                .errorMessage(parseResult.error())
                .processedAt(OffsetDateTime.now())
                .createdBy(createdBy)
                .build();
        
        message = messageRepository.save(message);
        
        // Publish event to Kafka
        if (parseResult.success()) {
            publishEdifactEvent("edifact-inbound", message, parseResult.parsedData());
        }
        
        return message;
    }
    
    @Transactional
    public EdifactMessage generateOutbound(
            UUID companyId,
            String messageType,
            Map<String, Object> data,
            UUID createdBy
    ) throws Exception {
        log.info("Generating outbound EDIFACT {} for company: {}", messageType, companyId);
        
        // Generate EDIFACT content
        String edifactContent = generateEdifact(messageType, data, companyId);
        
        // Store in MinIO
        String filePath = String.format("%s/outbound/%s/%s_%s.edi",
                companyId, OffsetDateTime.now().toLocalDate(), UUID.randomUUID(), messageType);
        
        byte[] contentBytes = edifactContent.getBytes(StandardCharsets.UTF_8);
        minioClient.putObject(PutObjectArgs.builder()
                .bucket(bucketName)
                .object(filePath)
                .stream(new ByteArrayInputStream(contentBytes), contentBytes.length, -1)
                .contentType("application/edifact")
                .build());
        
        // Create message record
        EdifactMessage message = EdifactMessage.builder()
                .companyId(companyId)
                .messageType(messageType)
                .messageVersion("D96A")  // Default version
                .direction(Direction.OUTBOUND)
                .interchangeRef(UUID.randomUUID().toString().substring(0, 14))
                .messageRef(UUID.randomUUID().toString().substring(0, 14))
                .filePath(filePath)
                .status(ProcessingStatus.COMPLETED)
                .processedAt(OffsetDateTime.now())
                .createdBy(createdBy)
                .build();
        
        message = messageRepository.save(message);
        
        // Publish event
        publishEdifactEvent("edifact-outbound", message, null);
        
        return message;
    }
    
    private String generateEdifact(String messageType, Map<String, Object> data, UUID companyId) {
        // Basic EDIFACT generation (would need proper template system for production)
        StringBuilder sb = new StringBuilder();
        
        String interchangeRef = UUID.randomUUID().toString().substring(0, 14);
        String messageRef = UUID.randomUUID().toString().substring(0, 14);
        String dateTime = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyMMdd:HHmm"));
        
        // UNB - Interchange header
        sb.append("UNB+UNOC:3+").append(companyId).append(":14+RECIPIENT:14+")
          .append(dateTime).append("+").append(interchangeRef).append("'");
        
        // UNH - Message header
        sb.append("UNH+").append(messageRef).append("+").append(messageType).append(":D:96A:UN'");
        
        // BGM - Beginning of message
        sb.append("BGM+").append(messageType).append("+").append(interchangeRef).append("+9'");
        
        // DTM - Date/time
        sb.append("DTM+137:").append(dateTime.replace(":", "")).append(":203'");
        
        // Add data-specific segments based on message type
        switch (messageType) {
            case "PRICAT" -> generatePricatSegments(sb, data);
            case "PRODAT" -> generateProdatSegments(sb, data);
            case "ORDERS" -> generateOrdersSegments(sb, data);
        }
        
        // UNT - Message trailer
        sb.append("UNT+").append(countSegments(sb.toString())).append("+").append(messageRef).append("'");
        
        // UNZ - Interchange trailer
        sb.append("UNZ+1+").append(interchangeRef).append("'");
        
        return sb.toString();
    }
    
    @SuppressWarnings("unchecked")
    private void generatePricatSegments(StringBuilder sb, Map<String, Object> data) {
        if (data.containsKey("items")) {
            List<Map<String, Object>> items = (List<Map<String, Object>>) data.get("items");
            int lineNum = 1;
            for (Map<String, Object> item : items) {
                sb.append("LIN+").append(lineNum++).append("++")
                  .append(item.getOrDefault("ean", "")).append(":EN'");
                sb.append("PIA+5+").append(item.getOrDefault("sku", "")).append(":SA'");
                sb.append("IMD+F++:::").append(item.getOrDefault("description", "")).append("'");
                sb.append("PRI+AAA:").append(item.getOrDefault("price", "0")).append("'");
            }
        }
    }
    
    @SuppressWarnings("unchecked")
    private void generateProdatSegments(StringBuilder sb, Map<String, Object> data) {
        if (data.containsKey("products")) {
            List<Map<String, Object>> products = (List<Map<String, Object>>) data.get("products");
            int lineNum = 1;
            for (Map<String, Object> product : products) {
                sb.append("LIN+").append(lineNum++).append("++")
                  .append(product.getOrDefault("gtin", "")).append(":EN'");
                sb.append("IMD+F++:::").append(product.getOrDefault("name", "")).append("'");
            }
        }
    }
    
    @SuppressWarnings("unchecked")
    private void generateOrdersSegments(StringBuilder sb, Map<String, Object> data) {
        // NAD segments for parties
        if (data.containsKey("buyer")) {
            Map<String, Object> buyer = (Map<String, Object>) data.get("buyer");
            sb.append("NAD+BY+").append(buyer.getOrDefault("id", "")).append("::9'");
        }
        if (data.containsKey("seller")) {
            Map<String, Object> seller = (Map<String, Object>) data.get("seller");
            sb.append("NAD+SE+").append(seller.getOrDefault("id", "")).append("::9'");
        }
        
        // Line items
        if (data.containsKey("items")) {
            List<Map<String, Object>> items = (List<Map<String, Object>>) data.get("items");
            int lineNum = 1;
            for (Map<String, Object> item : items) {
                sb.append("LIN+").append(lineNum++).append("++")
                  .append(item.getOrDefault("ean", "")).append(":EN'");
                sb.append("QTY+21:").append(item.getOrDefault("quantity", "1")).append("'");
            }
        }
    }
    
    private int countSegments(String edifact) {
        return (int) edifact.chars().filter(ch -> ch == '\'').count();
    }
    
    private String findSmooksConfig(String content, UUID companyId) {
        // Extract message type from content
        EdifactParser.ParseResult basicParse = parser.parse(content, null);
        if (basicParse.messageType() == null) return null;
        
        List<EdifactMapping> mappings = mappingRepository.findByMessageTypeAndCompany(
                basicParse.messageType(), companyId);
        
        return mappings.isEmpty() ? null : mappings.get(0).getSmooksConfig();
    }
    
    private void publishEdifactEvent(String topic, EdifactMessage message, String parsedData) {
        try {
            kafkaTemplate.send(topic, Map.of(
                    "type", "EDIFACT_" + message.getDirection().name(),
                    "messageId", message.getId().toString(),
                    "companyId", message.getCompanyId().toString(),
                    "messageType", message.getMessageType(),
                    "data", parsedData != null ? parsedData : "{}"
            ));
        } catch (Exception e) {
            log.error("Failed to publish EDIFACT event", e);
        }
    }
    
    public Optional<EdifactMessage> findById(UUID id) {
        return messageRepository.findById(id);
    }
    
    public Page<EdifactMessage> findByCompany(UUID companyId, Pageable pageable) {
        return messageRepository.findByCompanyId(companyId, pageable);
    }
    
    public Page<EdifactMessage> findByCompanyAndType(UUID companyId, String messageType, Pageable pageable) {
        return messageRepository.findByCompanyIdAndMessageType(companyId, messageType, pageable);
    }
    
    public byte[] downloadFile(UUID messageId) throws Exception {
        EdifactMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));
        
        try (InputStream stream = minioClient.getObject(GetObjectArgs.builder()
                .bucket(bucketName)
                .object(message.getFilePath())
                .build())) {
            return stream.readAllBytes();
        }
    }
}
