package com.erp.translation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTranslationKeyRequest {
    
    @NotBlank(message = "Key name is required")
    private String keyName;
    
    private String namespace;
    
    private String description;
}
