package com.erp.notification.repository;

import com.erp.notification.entity.SmtpConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SmtpConfigurationRepository extends JpaRepository<SmtpConfiguration, UUID> {
    
    /**
     * Find active SMTP configuration for a specific company
     */
    Optional<SmtpConfiguration> findByCompanyIdAndIsActiveTrue(UUID companyId);
    
    /**
     * Find global SMTP configuration (where companyId is null)
     */
    @Query("SELECT s FROM SmtpConfiguration s WHERE s.companyId IS NULL AND s.isActive = true")
    Optional<SmtpConfiguration> findGlobalConfiguration();
    
    /**
     * Find any active configuration - prioritizes company-specific, falls back to global
     */
    @Query("SELECT s FROM SmtpConfiguration s WHERE s.isActive = true ORDER BY s.companyId NULLS LAST")
    Optional<SmtpConfiguration> findAnyActiveConfiguration();
}
