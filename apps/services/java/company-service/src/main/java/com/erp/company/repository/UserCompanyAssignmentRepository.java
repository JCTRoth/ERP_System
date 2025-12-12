package com.erp.company.repository;

import com.erp.company.entity.UserCompanyAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserCompanyAssignmentRepository extends JpaRepository<UserCompanyAssignment, UUID> {

    List<UserCompanyAssignment> findByUserId(UUID userId);
    
    List<UserCompanyAssignment> findByCompanyId(UUID companyId);
    
    Optional<UserCompanyAssignment> findByUserIdAndCompanyId(UUID userId, UUID companyId);
    
    boolean existsByUserIdAndCompanyId(UUID userId, UUID companyId);
    
    @Modifying
    @Query("DELETE FROM UserCompanyAssignment uca WHERE uca.company.id = :companyId")
    void deleteAllByCompanyId(@Param("companyId") UUID companyId);
    
    @Query("SELECT uca FROM UserCompanyAssignment uca " +
           "JOIN FETCH uca.company " +
           "WHERE uca.userId = :userId")
    List<UserCompanyAssignment> findByUserIdWithCompany(@Param("userId") UUID userId);
    
    @Query("SELECT uca FROM UserCompanyAssignment uca WHERE uca.role = :role")
    List<UserCompanyAssignment> findByRole(@Param("role") UserCompanyAssignment.UserRole role);
}
