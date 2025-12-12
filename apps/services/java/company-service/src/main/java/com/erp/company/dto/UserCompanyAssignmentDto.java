package com.erp.company.dto;

import com.erp.company.entity.UserCompanyAssignment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCompanyAssignmentDto {
    private UUID id;
    private UUID userId;
    private UUID companyId;
    private String companyName;
    private UserCompanyAssignment.UserRole role;
    private Instant assignedAt;
}
