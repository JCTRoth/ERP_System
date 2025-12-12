package com.erp.company.graphql;

import com.erp.company.dto.AssignUserRequest;
import com.erp.company.dto.UserCompanyAssignmentDto;
import com.erp.company.entity.UserCompanyAssignment;
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

    @DgsQuery
    public UserCompanyAssignmentDto assignment(@InputArgument String userId, 
                                                @InputArgument String companyId) {
        return assignmentService.getAssignment(
                UUID.fromString(userId), 
                UUID.fromString(companyId)
        );
    }

    @DgsQuery
    public List<UserCompanyAssignmentDto> assignmentsByUser(@InputArgument String userId) {
        return assignmentService.getAssignmentsByUserId(UUID.fromString(userId));
    }

    @DgsQuery
    public List<UserCompanyAssignmentDto> assignmentsByCompany(@InputArgument String companyId) {
        return assignmentService.getAssignmentsByCompanyId(UUID.fromString(companyId));
    }

    @DgsMutation
    public UserCompanyAssignmentDto assignUserToCompany(@InputArgument Map<String, Object> input) {
        AssignUserRequest request = AssignUserRequest.builder()
                .userId(UUID.fromString((String) input.get("userId")))
                .companyId(UUID.fromString((String) input.get("companyId")))
                .role(UserCompanyAssignment.UserRole.valueOf((String) input.get("role")))
                .build();
        return assignmentService.assignUser(request);
    }

    @DgsMutation
    public UserCompanyAssignmentDto updateAssignmentRole(@InputArgument String userId,
                                                          @InputArgument String companyId,
                                                          @InputArgument String role) {
        return assignmentService.updateAssignmentRole(
                UUID.fromString(userId),
                UUID.fromString(companyId),
                UserCompanyAssignment.UserRole.valueOf(role)
        );
    }

    @DgsMutation
    public Boolean removeUserFromCompany(@InputArgument String userId, 
                                          @InputArgument String companyId) {
        assignmentService.removeAssignment(
                UUID.fromString(userId), 
                UUID.fromString(companyId)
        );
        return true;
    }
}
