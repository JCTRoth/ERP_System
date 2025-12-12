package com.erp.translation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LanguageConfigDto {
    private String code;
    private String name;
    private String flag;
    private boolean isDefault;
}
