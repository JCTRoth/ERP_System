package com.erp.company.dto;

import com.erp.company.entity.DynamicFieldDefinition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDynamicFieldRequest {
    
    @NotNull(message = "Company ID is required")
    private UUID companyId;
    
    @NotNull(message = "Entity type is required")
    private DynamicFieldDefinition.EntityType entityType;
    
    @NotBlank(message = "Field name is required")
    private String fieldName;
    
    @NotNull(message = "Field type is required")
    private DynamicFieldDefinition.FieldType fieldType;
    
    private Map<String, Object> validationRules;
    
    private Integer displayOrder;
}
