package com.erp.company.dto;

import com.erp.company.entity.UserCompanyAssignment;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignUserRequest {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Company ID is required")
    private UUID companyId;
    
    @NotNull(message = "Role is required")
    private UserCompanyAssignment.UserRole role;
}
