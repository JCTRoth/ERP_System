package com.erp.translation.dto;

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
public class TranslationBundleDto {
    private String language;
    private UUID companyId;
    private String namespace;
    private Map<String, String> translations;
}
