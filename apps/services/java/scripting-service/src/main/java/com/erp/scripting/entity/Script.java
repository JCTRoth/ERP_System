package com.erp.scripting.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "scripts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Script {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "text")
    private String description;
    
    @Column(nullable = false, columnDefinition = "text")
    private String code;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScriptType type;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_event")
    private TriggerEvent triggerEvent;
    
    @Column(name = "trigger_entity")
    private String triggerEntity;
    
    @Column(name = "is_active")
    private boolean isActive;
    
    @Column(name = "version")
    private int version;
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "updated_by")
    private UUID updatedBy;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (version == 0) {
            version = 1;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
        version++;
    }
    
    public enum ScriptType {
        VALIDATION,      // Validate data before save
        TRANSFORMATION,  // Transform data
        CALCULATION,     // Calculate values (e.g., prices, totals)
        AUTOMATION,      // Automated workflows
        CUSTOM_FIELD     // Custom field value calculation
    }
    
    public enum TriggerEvent {
        BEFORE_CREATE,
        AFTER_CREATE,
        BEFORE_UPDATE,
        AFTER_UPDATE,
        BEFORE_DELETE,
        AFTER_DELETE,
        MANUAL,
        SCHEDULED
    }
}
