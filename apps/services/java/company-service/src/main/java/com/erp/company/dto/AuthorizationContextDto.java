package com.erp.company.dto;

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
public class AuthorizationContextDto {
    private UUID userId;
    private UUID companyId;
    private String companyName;
    private Boolean membershipValid;
    private String companyRole;
    private Boolean isGlobalSuperAdmin;
    private List<String> groupCodes;
    private List<String> permissionCodes;
    private List<ScopeGrantDto> scopeGrants;
}
