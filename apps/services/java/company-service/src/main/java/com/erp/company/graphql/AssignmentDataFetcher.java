package com.erp.company.graphql;

import com.erp.company.dto.AssignUserRequest;
import com.erp.company.dto.UserCompanyAssignmentDto;
import com.erp.company.entity.UserCompanyAssignment;
import com.erp.company.exception.AccessDeniedException;
import com.erp.company.service.RequestAuthorizationService;
import com.erp.company.service.UserCompanyAssignmentService;
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
public class AssignmentDataFetcher {

    private final UserCompanyAssignmentService assignmentService;
    private final RequestAuthorizationService requestAuthorizationService;

    @DgsQuery
    public UserCompanyAssignmentDto assignment(@InputArgument String userId, 
                                                @InputArgument String companyId) {
        var targetUserId = UUID.fromString(userId);
        var targetCompanyId = UUID.fromString(companyId);
        requestAuthorizationService.requireCompanyAccess(targetCompanyId);
        requestAuthorizationService.requireSelfOrPermission(targetUserId, "company.assignment.read");
        return assignmentService.getAssignment(
                targetUserId,
                targetCompanyId
        );
    }

    @DgsQuery
    public List<UserCompanyAssignmentDto> assignmentsByUser(@InputArgument String userId) {
        var targetUserId = UUID.fromString(userId);
        var currentUserId = requestAuthorizationService.getCurrentUserId();
        if (!requestAuthorizationService.isGlobalSuperAdmin() && (currentUserId == null || !currentUserId.equals(targetUserId))) {
            throw new AccessDeniedException("Only the current user or a global super admin can list assignments by user");
        }
        return assignmentService.getAssignmentsByUserId(targetUserId);
    }

    @DgsQuery
    public List<UserCompanyAssignmentDto> assignmentsByCompany(@InputArgument String companyId) {
        var targetCompanyId = UUID.fromString(companyId);
        requestAuthorizationService.requirePermission("company.assignment.read");
        requestAuthorizationService.requireCompanyAccess(targetCompanyId);
        return assignmentService.getAssignmentsByCompanyId(targetCompanyId);
    }

    @DgsMutation
    public UserCompanyAssignmentDto assignUserToCompany(@InputArgument Map<String, Object> input) {
        var companyId = UUID.fromString((String) input.get("companyId"));
        requestAuthorizationService.requirePermission("company.assignment.manage");
        requestAuthorizationService.requireCompanyAccess(companyId);

        AssignUserRequest request = AssignUserRequest.builder()
                .userId(UUID.fromString((String) input.get("userId")))
                .companyId(companyId)
                .role(UserCompanyAssignment.UserRole.valueOf((String) input.get("role")))
                .build();
        return assignmentService.assignUser(request);
    }

    @DgsMutation
    public UserCompanyAssignmentDto updateAssignmentRole(@InputArgument String userId,
                                                          @InputArgument String companyId,
                                                          @InputArgument String role) {
        requestAuthorizationService.requirePermission("company.assignment.manage");
        requestAuthorizationService.requireCompanyAccess(UUID.fromString(companyId));
        return assignmentService.updateAssignmentRole(
                UUID.fromString(userId),
                UUID.fromString(companyId),
                UserCompanyAssignment.UserRole.valueOf(role)
        );
    }

    @DgsMutation
    public Boolean removeUserFromCompany(@InputArgument String userId, 
                                          @InputArgument String companyId) {
        requestAuthorizationService.requirePermission("company.assignment.manage");
        requestAuthorizationService.requireCompanyAccess(UUID.fromString(companyId));
        assignmentService.removeAssignment(
                UUID.fromString(userId), 
                UUID.fromString(companyId)
        );
        return true;
    }
}
