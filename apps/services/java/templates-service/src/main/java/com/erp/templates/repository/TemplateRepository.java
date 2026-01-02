package com.erp.templates.repository;

import com.erp.templates.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {
    Optional<Template> findByKeyAndLanguage(String key, String language);
    
    Optional<Template> findByKeyAndLanguageAndIsActive(String key, String language, Boolean isActive);
    
    List<Template> findByAssignedState(String assignedState);
    
    List<Template> findByAssignedStateAndIsActive(String assignedState, Boolean isActive);
    
    List<Template> findByCompanyIdOrCompanyIdIsNull(UUID companyId);
    
    List<Template> findByCompanyIdAndIsActive(UUID companyId, Boolean isActive);
    
    @Query("SELECT t FROM Template t WHERE t.assignedState = :state AND t.isActive = true " +
           "ORDER BY CASE WHEN t.companyId = :companyId THEN 0 ELSE 1 END ASC, t.createdAt DESC")
    List<Template> findByStateWithCompanyFallback(@Param("state") String state, @Param("companyId") UUID companyId);
    
    List<Template> findByDocumentType(String documentType);
}
