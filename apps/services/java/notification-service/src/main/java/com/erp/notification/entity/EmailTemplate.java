package com.erp.notification.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailTemplate {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "company_id")
    private UUID companyId;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(nullable = false)
    private String subject;
    
    @Column(name = "body_html", columnDefinition = "text", nullable = false)
    private String bodyHtml;
    
    @Column(name = "body_text", columnDefinition = "text")
    private String bodyText;
    
    @Column(nullable = false, length = 5)
    private String language;
    
    @Column(name = "is_active")
    private boolean isActive;
    
    @Column(columnDefinition = "text")
    private String description;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (!isActive) {
            isActive = true;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
