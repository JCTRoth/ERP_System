package com.erp.edifact.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "edifact_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EdifactMapping {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "company_id")
    private UUID companyId;  // Null for global mappings
    
    @Column(name = "message_type", nullable = false, length = 20)
    private String messageType;
    
    @Column(name = "message_version", length = 10)
    private String messageVersion;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "text")
    private String description;
    
    @Column(name = "smooks_config", columnDefinition = "text", nullable = false)
    private String smooksConfig;  // XML configuration for Smooks
    
    @Column(name = "is_active")
    private boolean isActive;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
