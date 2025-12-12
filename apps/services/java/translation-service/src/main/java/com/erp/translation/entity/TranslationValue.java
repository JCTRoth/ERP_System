package com.erp.translation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "translation_values",
       uniqueConstraints = @UniqueConstraint(columnNames = {"key_id", "language", "company_id"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranslationValue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "key_id", nullable = false)
    private TranslationKey key;

    @Column(nullable = false, length = 10)
    private String language;

    @Column(name = "value_text", columnDefinition = "TEXT")
    private String valueText;

    @Column(name = "company_id")
    private UUID companyId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
