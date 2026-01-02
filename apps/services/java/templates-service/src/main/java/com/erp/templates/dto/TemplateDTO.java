package com.erp.templates.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateDTO {
    private UUID id;
    private UUID companyId;
    private String title;
    private String key;
    private String content;
    private String language;
    private String documentType;
    private String assignedState;
    private Boolean isActive;
    private UUID createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String metadata;
}
