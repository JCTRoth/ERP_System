package com.erp.company.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpsertGroupRequest {
    private UUID id;

    @NotNull
    private UUID companyId;

    private String code;

    @NotNull
    private String name;

    private String description;

    @Builder.Default
    private List<ScopeGrantDto> permissions = List.of();
}
