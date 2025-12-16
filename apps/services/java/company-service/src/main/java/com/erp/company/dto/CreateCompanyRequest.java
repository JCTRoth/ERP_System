package com.erp.company.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCompanyRequest {
    
    @NotBlank(message = "Company name is required")
    @Size(min = 2, max = 255, message = "Company name must be between 2 and 255 characters")
    private String name;
    
    @NotBlank(message = "Company slug is required")
    @Size(min = 2, max = 255, message = "Company slug must be between 2 and 255 characters")
    private String slug;
    
    @Size(max = 1000, message = "Company description must not exceed 1000 characters")
    private String description;
    
    private Map<String, Object> settingsJson;
    
    private Boolean isActive;
}
