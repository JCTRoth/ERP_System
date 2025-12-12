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
public class TranslationKeyDto {
    private UUID id;
    private String keyName;
    private String namespace;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
