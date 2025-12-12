package com.erp.translation.dto;

import jakarta.validation.constraints.NotBlank;
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
public class SetTranslationRequest {
    
    @NotNull(message = "Key ID is required")
    private UUID keyId;
    
    @NotBlank(message = "Language is required")
    private String language;
    
    @NotBlank(message = "Value is required")
    private String valueText;
    
    private UUID companyId; // null for default translations
}
