package com.erp.company.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetDynamicFieldValueRequest {
    
    @NotNull(message = "Definition ID is required")
    private UUID definitionId;
    
    @NotNull(message = "Entity ID is required")
    private UUID entityId;
    
    private Object valueJson;
}
