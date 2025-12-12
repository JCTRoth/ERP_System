package com.erp.company.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "dynamic_field_definitions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "entity_type", "field_name"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicFieldDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 50)
    private EntityType entityType;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, length = 20)
    private FieldType fieldType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    private Map<String, Object> validationRules;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum EntityType {
        CUSTOMER,
        PRODUCT,
        ORDER,
        INVOICE,
        SUPPLIER,
        CUSTOM
    }

    public enum FieldType {
        STRING,
        NUMBER,
        BOOLEAN,
        DATE,
        DATETIME,
        ENUM,
        JSON
    }
}
