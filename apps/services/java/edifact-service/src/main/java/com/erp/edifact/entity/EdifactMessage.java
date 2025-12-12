package com.erp.edifact.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "edifact_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EdifactMessage {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    
    @Column(name = "message_type", nullable = false, length = 20)
    private String messageType;  // PRICAT, PRODAT, UTILMD, etc.
    
    @Column(name = "message_version", length = 10)
    private String messageVersion;  // D96A, D01B, etc.
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;
    
    @Column(name = "interchange_ref", length = 50)
    private String interchangeRef;
    
    @Column(name = "message_ref", length = 50)
    private String messageRef;
    
    @Column(name = "sender_id", length = 100)
    private String senderId;
    
    @Column(name = "recipient_id", length = 100)
    private String recipientId;
    
    @Column(name = "file_path")
    private String filePath;
    
    @Column(name = "original_filename")
    private String originalFilename;
    
    @Column(name = "parsed_data", columnDefinition = "jsonb")
    private String parsedData;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProcessingStatus status;
    
    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;
    
    @Column(name = "processed_at")
    private OffsetDateTime processedAt;
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) {
            status = ProcessingStatus.PENDING;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
    
    public enum Direction {
        INBOUND,
        OUTBOUND
    }
    
    public enum ProcessingStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED,
        REJECTED
    }
}
