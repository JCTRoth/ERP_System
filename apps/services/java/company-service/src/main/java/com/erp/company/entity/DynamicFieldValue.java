package com.erp.company.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "dynamic_field_values",
       uniqueConstraints = @UniqueConstraint(columnNames = {"definition_id", "entity_id"}),
       indexes = @Index(columnList = "entity_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "definition_id", nullable = false)
    private DynamicFieldDefinition definition;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "value_json", columnDefinition = "jsonb")
    private Object valueJson;
}
