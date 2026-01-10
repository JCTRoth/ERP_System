package com.erp.notification.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "smtp_configuration")
public class SmtpConfiguration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @Column(name = "company_id")
    private UUID companyId;
    
    @Column(name = "smtp_host", nullable = false)
    private String smtpHost;
    
    @Column(name = "smtp_port", nullable = false)
    private Integer smtpPort = 587;
    
    @Column(name = "smtp_username")
    private String smtpUsername;
    
    @Column(name = "smtp_password", length = 500)
    private String smtpPassword; // Should be encrypted
    
    @Column(name = "email_from", nullable = false)
    private String emailFrom;
    
    @Column(name = "email_from_name")
    private String emailFromName;
    
    @Column(name = "use_tls")
    private Boolean useTls = true;
    
    @Column(name = "use_ssl")
    private Boolean useSsl = false;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "last_modified_by")
    private UUID lastModifiedBy;
}
