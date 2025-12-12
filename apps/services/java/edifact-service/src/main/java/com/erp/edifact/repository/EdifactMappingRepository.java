package com.erp.edifact.repository;

import com.erp.edifact.entity.EdifactMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EdifactMappingRepository extends JpaRepository<EdifactMapping, UUID> {
    
    List<EdifactMapping> findByCompanyIdIsNull();
    
    List<EdifactMapping> findByCompanyId(UUID companyId);
    
    @Query("SELECT m FROM EdifactMapping m WHERE m.messageType = :type " +
           "AND (m.companyId = :companyId OR m.companyId IS NULL) " +
           "AND m.isActive = true " +
           "ORDER BY m.companyId DESC NULLS LAST")
    List<EdifactMapping> findByMessageTypeAndCompany(
            @Param("type") String messageType,
            @Param("companyId") UUID companyId
    );
    
    Optional<EdifactMapping> findByMessageTypeAndMessageVersionAndCompanyIdIsNull(
            String messageType,
            String messageVersion
    );
    
    List<EdifactMapping> findByIsActiveTrue();
}
