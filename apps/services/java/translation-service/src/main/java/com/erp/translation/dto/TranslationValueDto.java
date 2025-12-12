package com.erp.translation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranslationValueDto {
    private UUID id;
    private UUID keyId;
    private String keyName;
    private String language;
    private String valueText;
    private UUID companyId;
    private boolean isOverride;
    private Instant createdAt;
    private Instant updatedAt;
}
