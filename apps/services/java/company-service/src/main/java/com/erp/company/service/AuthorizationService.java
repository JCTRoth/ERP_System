package com.erp.company.service;

import com.erp.company.dto.*;
import com.erp.company.entity.*;
import com.erp.company.exception.InvalidRequestException;
import com.erp.company.exception.ResourceNotFoundException;
import com.erp.company.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthorizationService {

    private final CompanyRepository companyRepository;
    private final UserCompanyAssignmentRepository assignmentRepository;
    private final AuthorizationGroupRepository groupRepository;
    private final PermissionRepository permissionRepository;
    private final GroupPermissionRepository groupPermissionRepository;
    private final UserGroupAssignmentRepository userGroupAssignmentRepository;

    @Transactional
    public void bootstrapAuthorizationModel() {
        ensurePermissionCatalog();

        companyRepository.findAll().forEach(company -> ensureSystemGroupsForCompany(company.getId()));

        assignmentRepository.findAll().forEach(this::syncAssignmentToDefaultGroups);
    }

    @Transactional
    public void ensureSystemGroupsForCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        ensurePermissionCatalog();

        for (var roleCode : PermissionCatalog.systemGroupCodes()) {
            AuthorizationGroup group = groupRepository.findByCompanyIdAndCode(companyId, roleCode)
                    .orElseGet(() -> groupRepository.save(AuthorizationGroup.builder()
                            .company(company)
                            .code(roleCode)
                            .name(roleCode.replace('_', ' '))
                            .description("System group for role " + roleCode)
                            .isSystem(true)
                            .build()));

            syncGroupPermissions(group, PermissionCatalog.defaultsForRole(UserCompanyAssignment.UserRole.valueOf(roleCode)));
        }
    }

    @Transactional
    public void syncAssignmentToDefaultGroups(UserCompanyAssignment assignment) {
        UUID companyId = assignment.getCompany().getId();
        ensureSystemGroupsForCompany(companyId);

        userGroupAssignmentRepository.deleteSystemAssignments(assignment.getUserId(), companyId);

        AuthorizationGroup defaultGroup = groupRepository.findByCompanyIdAndCode(companyId, assignment.getRole().name())
                .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "code", assignment.getRole().name()));

        if (!userGroupAssignmentRepository.existsByUserIdAndCompanyIdAndGroupId(assignment.getUserId(), companyId, defaultGroup.getId())) {
            userGroupAssignmentRepository.save(UserGroupAssignment.builder()
                    .userId(assignment.getUserId())
                    .companyId(companyId)
                    .group(defaultGroup)
                    .build());
        }
    }

    @Transactional
    public void removeUserGroups(UUID userId, UUID companyId) {
        userGroupAssignmentRepository.deleteByUserIdAndCompanyId(userId, companyId);
    }

    @Transactional
    public AuthorizationContextDto resolveAuthorizationContext(UUID userId, UUID companyId, boolean isGlobalSuperAdmin) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        Optional<UserCompanyAssignment> assignment = assignmentRepository.findByUserIdAndCompanyId(userId, companyId);
        boolean membershipValid = assignment.isPresent() || isGlobalSuperAdmin;

        if (!membershipValid) {
            return AuthorizationContextDto.builder()
                    .userId(userId)
                    .companyId(companyId)
                    .companyName(company.getName())
                    .membershipValid(false)
                    .companyRole(null)
                    .isGlobalSuperAdmin(isGlobalSuperAdmin)
                    .groupCodes(List.of())
                    .permissionCodes(List.of())
                    .scopeGrants(List.of())
                    .build();
        }

        List<UserGroupAssignment> groupAssignments = userGroupAssignmentRepository.findDetailedByUserIdAndCompanyId(userId, companyId);

        if (groupAssignments.isEmpty() && assignment.isPresent()) {
            return withFreshAssignments(userId, companyId, assignment.get(), isGlobalSuperAdmin, company);
        }

        List<AuthorizationGroup> effectiveGroups = groupAssignments.stream()
                .map(UserGroupAssignment::getGroup)
                .toList();

        if (effectiveGroups.isEmpty() && isGlobalSuperAdmin) {
            AuthorizationGroup superAdminGroup = groupRepository.findByCompanyIdAndCode(companyId, UserCompanyAssignment.UserRole.SUPER_ADMIN.name())
                    .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "code", UserCompanyAssignment.UserRole.SUPER_ADMIN.name()));
            effectiveGroups = List.of(superAdminGroup);
        }

        return buildAuthorizationContext(userId, company, assignment.orElse(null), isGlobalSuperAdmin, effectiveGroups);
    }

    @Transactional
    public List<AuthorizationGroupDto> getGroupsByCompany(UUID companyId) {
        ensureSystemGroupsForCompany(companyId);
        return groupRepository.findDetailedByCompanyId(companyId).stream()
                .map(this::toGroupDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionDto> getPermissionsCatalog() {
        return permissionRepository.findAllByOrderByResourceAscOperationAscCodeAsc().stream()
                .map(permission -> PermissionDto.builder()
                        .id(permission.getId())
                        .code(permission.getCode())
                        .resource(permission.getResource())
                        .operation(permission.getOperation())
                        .description(permission.getDescription())
                        .build())
                .toList();
    }

    @Transactional
    public List<AuthorizationGroupDto> assignUserGroups(AssignUserGroupsRequest request) {
        ensureSystemGroupsForCompany(request.getCompanyId());

        UserCompanyAssignment assignment = assignmentRepository.findByUserIdAndCompanyId(request.getUserId(), request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found for user " + request.getUserId() + " and company " + request.getCompanyId()));

        List<AuthorizationGroup> requestedGroups = request.getGroupIds().isEmpty()
                ? List.of()
                : groupRepository.findAllById(request.getGroupIds());

        if (requestedGroups.size() != request.getGroupIds().size()) {
            throw new InvalidRequestException("One or more authorization groups do not exist");
        }

        if (requestedGroups.stream().anyMatch(group -> !group.getCompany().getId().equals(request.getCompanyId()))) {
            throw new InvalidRequestException("Authorization groups must belong to the same company");
        }

        AuthorizationGroup defaultGroup = groupRepository.findByCompanyIdAndCode(request.getCompanyId(), assignment.getRole().name())
                .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "code", assignment.getRole().name()));

        var targetGroupIds = new LinkedHashSet<UUID>();
        targetGroupIds.add(defaultGroup.getId());
        request.getGroupIds().forEach(targetGroupIds::add);

        userGroupAssignmentRepository.deleteByUserIdAndCompanyId(request.getUserId(), request.getCompanyId());

        for (UUID groupId : targetGroupIds) {
            AuthorizationGroup group = groupRepository.findById(groupId)
                    .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "id", groupId));

            userGroupAssignmentRepository.save(UserGroupAssignment.builder()
                    .userId(request.getUserId())
                    .companyId(request.getCompanyId())
                    .group(group)
                    .build());
        }

        return groupRepository.findDetailedByCompanyId(request.getCompanyId()).stream()
                .filter(group -> targetGroupIds.contains(group.getId()))
                .map(this::toGroupDto)
                .toList();
    }

    @Transactional
    public AuthorizationGroupDto upsertGroup(UpsertGroupRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        AuthorizationGroup group;
        if (request.getId() != null) {
            group = groupRepository.findById(request.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "id", request.getId()));
            if (!group.getCompany().getId().equals(request.getCompanyId())) {
                throw new InvalidRequestException("Authorization group does not belong to company " + request.getCompanyId());
            }
            if (Boolean.TRUE.equals(group.getIsSystem())) {
                throw new InvalidRequestException("System groups cannot be edited");
            }
        } else {
            String code = normalizeGroupCode(request.getCode() != null ? request.getCode() : request.getName());
            if (groupRepository.existsByCompanyIdAndCode(request.getCompanyId(), code)) {
                throw new InvalidRequestException("Authorization group with code " + code + " already exists");
            }

            group = AuthorizationGroup.builder()
                    .company(company)
                    .code(code)
                    .isSystem(false)
                    .build();
        }

        group.setName(request.getName());
        group.setDescription(request.getDescription());

        AuthorizationGroup saved = groupRepository.save(group);
        syncGroupPermissions(saved, Optional.ofNullable(request.getPermissions()).orElse(List.of()).stream()
                .map(permission -> new PermissionCatalog.ScopeGrantDefinition(
                        permission.getPermissionCode(),
                        GroupPermission.ScopeType.valueOf(permission.getScopeType()),
                        permission.getScopeJson()))
                .toList());

        AuthorizationGroup refreshed = groupRepository.findDetailedByCompanyId(request.getCompanyId()).stream()
                .filter(item -> item.getId().equals(saved.getId()))
                .findFirst()
                .orElse(saved);

        return toGroupDto(refreshed);
    }

    @Transactional
    public boolean deleteGroup(UUID groupId) {
        AuthorizationGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "id", groupId));

        if (Boolean.TRUE.equals(group.getIsSystem())) {
            throw new InvalidRequestException("System groups cannot be deleted");
        }

        userGroupAssignmentRepository.deleteByGroupId(groupId);
        groupPermissionRepository.deleteByGroupId(groupId);
        groupRepository.delete(group);
        return true;
    }

    @Transactional(readOnly = true)
    public UUID getGroupCompanyId(UUID groupId) {
        return groupRepository.findById(groupId)
                .map(group -> group.getCompany().getId())
                .orElseThrow(() -> new ResourceNotFoundException("AuthorizationGroup", "id", groupId));
    }

    private void ensurePermissionCatalog() {
        Map<String, Permission> existing = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getCode, Function.identity(), (left, right) -> left));

        List<Permission> missing = PermissionCatalog.allDefinitions().stream()
                .filter(definition -> !existing.containsKey(definition.code()))
                .map(definition -> Permission.builder()
                        .code(definition.code())
                        .resource(definition.resource())
                        .operation(definition.operation())
                        .description(definition.description())
                        .build())
                .toList();

        if (!missing.isEmpty()) {
            permissionRepository.saveAll(missing);
        }
    }

    private void syncGroupPermissions(AuthorizationGroup group, List<PermissionCatalog.ScopeGrantDefinition> grants) {
        groupPermissionRepository.deleteByGroupId(group.getId());

        if (grants.isEmpty()) {
            return;
        }

        Map<String, Permission> permissionsByCode = permissionRepository.findByCodeIn(
                        grants.stream().map(PermissionCatalog.ScopeGrantDefinition::permissionCode).toList())
                .stream()
                .collect(Collectors.toMap(Permission::getCode, Function.identity()));

        List<GroupPermission> entities = grants.stream()
                .map(grant -> {
                    Permission permission = permissionsByCode.get(grant.permissionCode());
                    if (permission == null) {
                        throw new InvalidRequestException("Unknown permission code " + grant.permissionCode());
                    }

                    return GroupPermission.builder()
                            .group(group)
                            .permission(permission)
                            .scopeType(grant.scopeType())
                            .scopeJson(grant.scopeJson())
                            .build();
                })
                .toList();

        groupPermissionRepository.saveAll(entities);
    }

    private AuthorizationContextDto withFreshAssignments(UUID userId,
                                                         UUID companyId,
                                                         UserCompanyAssignment assignment,
                                                         boolean isGlobalSuperAdmin,
                                                         Company company) {
        syncAssignmentToDefaultGroups(assignment);
        List<UserGroupAssignment> refreshedAssignments = userGroupAssignmentRepository.findDetailedByUserIdAndCompanyId(userId, companyId);
        return buildAuthorizationContext(userId, company, assignment, isGlobalSuperAdmin,
                refreshedAssignments.stream().map(UserGroupAssignment::getGroup).toList());
    }

    private AuthorizationContextDto buildAuthorizationContext(UUID userId,
                                                              Company company,
                                                              UserCompanyAssignment assignment,
                                                              boolean isGlobalSuperAdmin,
                                                              List<AuthorizationGroup> effectiveGroups) {
        Map<String, ScopeGrantDto> grants = new LinkedHashMap<>();

        for (AuthorizationGroup group : effectiveGroups) {
            for (GroupPermission grant : group.getPermissionGrants()) {
                String key = grant.getPermission().getCode() + ":" + grant.getScopeType();
                grants.putIfAbsent(key, ScopeGrantDto.builder()
                        .permissionCode(grant.getPermission().getCode())
                        .scopeType(grant.getScopeType().name())
                        .scopeJson(grant.getScopeJson())
                        .build());
            }
        }

        List<String> permissionCodes = grants.values().stream()
                .map(ScopeGrantDto::getPermissionCode)
                .distinct()
                .sorted()
                .toList();

        return AuthorizationContextDto.builder()
                .userId(userId)
                .companyId(company.getId())
                .companyName(company.getName())
                .membershipValid(true)
                .companyRole(assignment != null ? assignment.getRole().name() : UserCompanyAssignment.UserRole.SUPER_ADMIN.name())
                .isGlobalSuperAdmin(isGlobalSuperAdmin)
                .groupCodes(effectiveGroups.stream().map(AuthorizationGroup::getCode).distinct().sorted().toList())
                .permissionCodes(permissionCodes)
                .scopeGrants(new ArrayList<>(grants.values()))
                .build();
    }

    private AuthorizationGroupDto toGroupDto(AuthorizationGroup group) {
        return AuthorizationGroupDto.builder()
                .id(group.getId())
                .companyId(group.getCompany().getId())
                .code(group.getCode())
                .name(group.getName())
                .description(group.getDescription())
                .isSystem(group.getIsSystem())
                .createdAt(group.getCreatedAt())
                .permissions(group.getPermissionGrants().stream()
                        .map(permission -> ScopeGrantDto.builder()
                                .permissionCode(permission.getPermission().getCode())
                                .scopeType(permission.getScopeType().name())
                                .scopeJson(permission.getScopeJson())
                                .build())
                        .sorted(Comparator.comparing(ScopeGrantDto::getPermissionCode))
                        .toList())
                .build();
    }

    private String normalizeGroupCode(String rawCode) {
        return rawCode.trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("(^_+|_+$)", "");
    }
}
