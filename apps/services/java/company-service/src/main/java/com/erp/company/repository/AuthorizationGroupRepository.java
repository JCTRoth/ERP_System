package com.erp.company.repository;

import com.erp.company.entity.AuthorizationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthorizationGroupRepository extends JpaRepository<AuthorizationGroup, UUID> {

    List<AuthorizationGroup> findByCompanyIdOrderByIsSystemDescCodeAsc(UUID companyId);

    List<AuthorizationGroup> findByCompanyIdAndIsSystemTrueOrderByCodeAsc(UUID companyId);

    Optional<AuthorizationGroup> findByCompanyIdAndCode(UUID companyId, String code);

    boolean existsByCompanyIdAndCode(UUID companyId, String code);

    @Query("SELECT g FROM AuthorizationGroup g " +
           "LEFT JOIN FETCH g.permissionGrants gp " +
           "LEFT JOIN FETCH gp.permission " +
           "WHERE g.company.id = :companyId " +
           "ORDER BY g.isSystem DESC, g.code ASC")
    List<AuthorizationGroup> findDetailedByCompanyId(@Param("companyId") UUID companyId);
}
