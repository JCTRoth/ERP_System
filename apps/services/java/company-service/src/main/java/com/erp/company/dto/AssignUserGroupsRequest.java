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
public class AssignUserGroupsRequest {
    @NotNull
    private UUID userId;

    @NotNull
    private UUID companyId;

    @Builder.Default
    private List<UUID> groupIds = List.of();
}
