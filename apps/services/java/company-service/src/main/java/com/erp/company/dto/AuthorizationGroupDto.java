package com.erp.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorizationGroupDto {
    private UUID id;
    private UUID companyId;
    private String code;
    private String name;
    private String description;
    private Boolean isSystem;
    private Instant createdAt;
    private List<ScopeGrantDto> permissions;
}
