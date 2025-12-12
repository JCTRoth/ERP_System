package com.erp.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicFieldValueDto {
    private UUID id;
    private UUID definitionId;
    private UUID entityId;
    private String fieldName;
    private Object valueJson;
}
