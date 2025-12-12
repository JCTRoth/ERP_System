package com.erp.company.event;

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
public class UserAssignmentEvent {
    
    private EventType eventType;
    private UUID userId;
    private UUID companyId;
    private String companyName;
    private UserCompanyAssignment.UserRole role;
    
    @Builder.Default
    private Instant timestamp = Instant.now();
    
    public enum EventType {
        ASSIGNED,
        REMOVED,
        ROLE_CHANGED
    }
}
