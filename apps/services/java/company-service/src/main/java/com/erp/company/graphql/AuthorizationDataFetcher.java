package com.erp.company.graphql;

import com.erp.company.dto.AssignUserGroupsRequest;
import com.erp.company.dto.AuthorizationContextDto;
import com.erp.company.dto.AuthorizationGroupDto;
import com.erp.company.dto.PermissionDto;
import com.erp.company.dto.ScopeGrantDto;
import com.erp.company.dto.UpsertGroupRequest;
import com.erp.company.service.AuthorizationService;
import com.erp.company.service.RequestAuthorizationService;
import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class AuthorizationDataFetcher {

    private final AuthorizationService authorizationService;
    private final RequestAuthorizationService requestAuthorizationService;

    @DgsQuery
    public AuthorizationContextDto authorizationContext(@InputArgument String userId, @InputArgument String companyId) {
        requestAuthorizationService.requireInternalAccess();
        return authorizationService.resolveAuthorizationContext(
                UUID.fromString(userId),
                UUID.fromString(companyId),
                requestAuthorizationService.isInternalGlobalSuperAdmin()
        );
    }

    @DgsQuery
    public List<AuthorizationGroupDto> groupsByCompany(@InputArgument String companyId) {
        var targetCompanyId = UUID.fromString(companyId);
        requestAuthorizationService.requirePermission("company.group.read");
        requestAuthorizationService.requireCompanyAccess(targetCompanyId);
        return authorizationService.getGroupsByCompany(targetCompanyId);
    }

    @DgsQuery
    public List<PermissionDto> permissionsCatalog() {
        requestAuthorizationService.requirePermission("company.group.read");
        return authorizationService.getPermissionsCatalog();
    }

    @DgsMutation
    public List<AuthorizationGroupDto> assignUserGroups(@InputArgument Map<String, Object> input) {
        var companyId = UUID.fromString((String) input.get("companyId"));
        requestAuthorizationService.requirePermission("company.group.manage");
        requestAuthorizationService.requireCompanyAccess(companyId);

        List<String> rawGroupIds = input.get("groupIds") instanceof List<?>
                ? ((List<?>) input.get("groupIds")).stream().map(String::valueOf).toList()
                : List.of();

        return authorizationService.assignUserGroups(AssignUserGroupsRequest.builder()
                .userId(UUID.fromString((String) input.get("userId")))
                .companyId(companyId)
                .groupIds(rawGroupIds.stream().map(UUID::fromString).toList())
                .build());
    }

    @DgsMutation
    @SuppressWarnings("unchecked")
    public AuthorizationGroupDto upsertGroup(@InputArgument Map<String, Object> input) {
        var companyId = UUID.fromString((String) input.get("companyId"));
        requestAuthorizationService.requirePermission("company.group.manage");
        requestAuthorizationService.requireCompanyAccess(companyId);

        List<ScopeGrantDto> permissions = input.get("permissions") instanceof List<?>
                ? ((List<Map<String, Object>>) input.get("permissions")).stream()
                    .map(permission -> ScopeGrantDto.builder()
                            .permissionCode((String) permission.get("permissionCode"))
                            .scopeType((String) permission.get("scopeType"))
                            .scopeJson((String) permission.get("scopeJson"))
                            .build())
                    .toList()
                : List.of();

        return authorizationService.upsertGroup(UpsertGroupRequest.builder()
                .id(input.get("id") != null ? UUID.fromString((String) input.get("id")) : null)
                .companyId(companyId)
                .code((String) input.get("code"))
                .name((String) input.get("name"))
                .description((String) input.get("description"))
                .permissions(permissions)
                .build());
    }

    @DgsMutation
    public Boolean deleteGroup(@InputArgument String groupId) {
        requestAuthorizationService.requirePermission("company.group.manage");
        requestAuthorizationService.requireCompanyAccess(authorizationService.getGroupCompanyId(UUID.fromString(groupId)));
        return authorizationService.deleteGroup(UUID.fromString(groupId));
    }
}
