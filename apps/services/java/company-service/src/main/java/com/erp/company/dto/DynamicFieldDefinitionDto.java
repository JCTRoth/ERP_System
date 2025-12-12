package com.erp.company.dto;

import com.erp.company.entity.DynamicFieldDefinition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicFieldDefinitionDto {
    private UUID id;
    private UUID companyId;
    private DynamicFieldDefinition.EntityType entityType;
    private String fieldName;
    private DynamicFieldDefinition.FieldType fieldType;
    private Map<String, Object> validationRules;
    private Integer displayOrder;
    private Instant createdAt;
}
