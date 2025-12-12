package com.erp.notification.repository;

import com.erp.notification.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {
    
    Optional<EmailTemplate> findByNameAndLanguage(String name, String language);
    
    @Query("SELECT t FROM EmailTemplate t WHERE t.name = :name AND " +
           "(t.companyId = :companyId OR t.companyId IS NULL) AND t.language = :language " +
           "ORDER BY t.companyId DESC NULLS LAST")
    List<EmailTemplate> findByNameAndCompanyIdOrGlobal(
            @Param("name") String name,
            @Param("companyId") UUID companyId,
            @Param("language") String language
    );
    
    List<EmailTemplate> findByCompanyIdIsNull();
    
    List<EmailTemplate> findByCompanyId(UUID companyId);
    
    List<EmailTemplate> findByIsActiveTrue();
    
    boolean existsByName(String name);
}
