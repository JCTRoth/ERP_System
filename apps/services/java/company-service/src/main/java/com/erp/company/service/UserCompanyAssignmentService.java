package com.erp.company.service;

import com.erp.company.dto.AssignUserRequest;
import com.erp.company.dto.UserCompanyAssignmentDto;
import com.erp.company.entity.Company;
import com.erp.company.entity.UserCompanyAssignment;
import com.erp.company.event.UserAssignmentEvent;
import com.erp.company.exception.DuplicateResourceException;
import com.erp.company.exception.ResourceNotFoundException;
import com.erp.company.mapper.UserCompanyAssignmentMapper;
import com.erp.company.repository.CompanyRepository;
import com.erp.company.repository.UserCompanyAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserCompanyAssignmentService {

    private static final String ASSIGNMENT_TOPIC = "user-company-assignments";

    private final UserCompanyAssignmentRepository assignmentRepository;
    private final CompanyRepository companyRepository;
    private final UserCompanyAssignmentMapper assignmentMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional(readOnly = true)
    public List<UserCompanyAssignmentDto> getAssignmentsByUserId(UUID userId) {
        return assignmentMapper.toDtoList(
                assignmentRepository.findByUserIdWithCompany(userId)
        );
    }

    @Transactional(readOnly = true)
    public List<UserCompanyAssignmentDto> getAssignmentsByCompanyId(UUID companyId) {
        return assignmentMapper.toDtoList(
                assignmentRepository.findByCompanyId(companyId)
        );
    }

    @Transactional(readOnly = true)
    public UserCompanyAssignmentDto getAssignment(UUID userId, UUID companyId) {
        UserCompanyAssignment assignment = assignmentRepository
                .findByUserIdAndCompanyId(userId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assignment not found for user " + userId + " and company " + companyId
                ));
        return assignmentMapper.toDto(assignment);
    }

    @Transactional
    public UserCompanyAssignmentDto assignUser(AssignUserRequest request) {
        if (assignmentRepository.existsByUserIdAndCompanyId(request.getUserId(), request.getCompanyId())) {
            throw new DuplicateResourceException(
                    "User " + request.getUserId() + " is already assigned to company " + request.getCompanyId()
            );
        }

        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        UserCompanyAssignment assignment = UserCompanyAssignment.builder()
                .userId(request.getUserId())
                .company(company)
                .role(request.getRole())
                .build();

        UserCompanyAssignment saved = assignmentRepository.save(assignment);
        log.info("Assigned user {} to company {} with role {}", 
                request.getUserId(), company.getName(), request.getRole());

        // Publish event
        publishAssignmentEvent(saved, UserAssignmentEvent.EventType.ASSIGNED);

        return assignmentMapper.toDto(saved);
    }

    @Transactional
    public UserCompanyAssignmentDto updateAssignmentRole(UUID userId, UUID companyId, 
                                                          UserCompanyAssignment.UserRole newRole) {
        UserCompanyAssignment assignment = assignmentRepository
                .findByUserIdAndCompanyId(userId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assignment not found for user " + userId + " and company " + companyId
                ));

        UserCompanyAssignment.UserRole oldRole = assignment.getRole();
        assignment.setRole(newRole);
        
        UserCompanyAssignment saved = assignmentRepository.save(assignment);
        log.info("Updated role for user {} in company {} from {} to {}", 
                userId, companyId, oldRole, newRole);

        // Publish event
        publishAssignmentEvent(saved, UserAssignmentEvent.EventType.ROLE_CHANGED);

        return assignmentMapper.toDto(saved);
    }

    @Transactional
    public void removeAssignment(UUID userId, UUID companyId) {
        UserCompanyAssignment assignment = assignmentRepository
                .findByUserIdAndCompanyId(userId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assignment not found for user " + userId + " and company " + companyId
                ));

        assignmentRepository.delete(assignment);
        log.info("Removed user {} from company {}", userId, companyId);

        // Publish event
        publishAssignmentEvent(assignment, UserAssignmentEvent.EventType.REMOVED);
    }

    @Transactional(readOnly = true)
    public boolean hasRole(UUID userId, UUID companyId, UserCompanyAssignment.UserRole requiredRole) {
        return assignmentRepository.findByUserIdAndCompanyId(userId, companyId)
                .map(assignment -> {
                    int userRoleLevel = getRoleLevel(assignment.getRole());
                    int requiredRoleLevel = getRoleLevel(requiredRole);
                    return userRoleLevel >= requiredRoleLevel;
                })
                .orElse(false);
    }

    private int getRoleLevel(UserCompanyAssignment.UserRole role) {
        return switch (role) {
            case SUPER_ADMIN -> 4;
            case ADMIN -> 3;
            case USER -> 2;
            case VIEWER -> 1;
        };
    }

    private void publishAssignmentEvent(UserCompanyAssignment assignment, 
                                        UserAssignmentEvent.EventType eventType) {
        try {
            UserAssignmentEvent event = UserAssignmentEvent.builder()
                    .eventType(eventType)
                    .userId(assignment.getUserId())
                    .companyId(assignment.getCompany().getId())
                    .companyName(assignment.getCompany().getName())
                    .role(assignment.getRole())
                    .build();

            kafkaTemplate.send(ASSIGNMENT_TOPIC, assignment.getUserId().toString(), event);
            log.debug("Published assignment event: {}", event);
        } catch (Exception e) {
            log.error("Failed to publish assignment event", e);
        }
    }
}
