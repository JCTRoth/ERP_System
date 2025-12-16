package com.erp.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String logoUrl;
    private Map<String, Object> settingsJson;
    private Boolean isDemo;
    private Boolean isActive;
    private Instant createdAt;
}
