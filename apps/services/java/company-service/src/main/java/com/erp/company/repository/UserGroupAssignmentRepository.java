package com.erp.company.repository;

import com.erp.company.entity.UserGroupAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserGroupAssignmentRepository extends JpaRepository<UserGroupAssignment, UUID> {

    @Query("SELECT uga FROM UserGroupAssignment uga " +
           "JOIN FETCH uga.group g " +
           "LEFT JOIN FETCH g.permissionGrants gp " +
           "LEFT JOIN FETCH gp.permission " +
           "WHERE uga.userId = :userId AND uga.companyId = :companyId")
    List<UserGroupAssignment> findDetailedByUserIdAndCompanyId(@Param("userId") UUID userId,
                                                               @Param("companyId") UUID companyId);

    List<UserGroupAssignment> findByUserIdAndCompanyId(UUID userId, UUID companyId);

    boolean existsByUserIdAndCompanyIdAndGroupId(UUID userId, UUID companyId, UUID groupId);

    @Modifying
    void deleteByUserIdAndCompanyId(UUID userId, UUID companyId);

    @Modifying
    @Query("DELETE FROM UserGroupAssignment uga " +
           "WHERE uga.userId = :userId AND uga.companyId = :companyId AND uga.group.isSystem = true")
    void deleteSystemAssignments(@Param("userId") UUID userId, @Param("companyId") UUID companyId);

    @Modifying
    @Query("DELETE FROM UserGroupAssignment uga WHERE uga.group.id = :groupId")
    void deleteByGroupId(@Param("groupId") UUID groupId);
}
