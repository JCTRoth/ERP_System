package com.erp.notification.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailNotification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "company_id")
    private UUID companyId;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "to_email", nullable = false)
    private String toEmail;
    
    @Column(name = "to_name")
    private String toName;
    
    @Column(nullable = false)
    private String subject;
    
    @Column(name = "template_name")
    private String templateName;
    
    @Column(name = "template_data", columnDefinition = "text")
    private String templateData;
    
    @Column(name = "body_html", columnDefinition = "text")
    private String bodyHtml;
    
    @Column(name = "body_text", columnDefinition = "text")
    private String bodyText;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status;
    
    @Column(name = "retry_count")
    private int retryCount;
    
    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;
    
    @Column(name = "sent_at")
    private OffsetDateTime sentAt;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (status == null) {
            status = NotificationStatus.PENDING;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
    
    public enum NotificationStatus {
        PENDING,
        SENDING,
        SENT,
        FAILED,
        CANCELLED
    }
}
