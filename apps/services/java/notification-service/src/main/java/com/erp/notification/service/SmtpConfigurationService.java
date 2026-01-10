package com.erp.notification.service;

import com.erp.notification.entity.SmtpConfiguration;
import com.erp.notification.repository.SmtpConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpConfigurationService {
    
    private final SmtpConfigurationRepository smtpConfigurationRepository;
    
    // Environment variable defaults
    @Value("${spring.mail.host:smtp.1und1.de}")
    private String defaultSmtpHost;
    
    @Value("${spring.mail.port:587}")
    private Integer defaultSmtpPort;
    
    @Value("${spring.mail.username:}")
    private String defaultSmtpUsername;
    
    @Value("${spring.mail.password:}")
    private String defaultSmtpPassword;
    
    @Value("${erp.email.from:noreply@erp-system.local}")
    private String defaultEmailFrom;
    
    @Value("${erp.email.from-name:ERP System}")
    private String defaultEmailFromName;
    
    /**
     * Get SMTP configuration with fallback to environment variables
     * Priority: Company-specific DB config > Global DB config > Environment variables
     */
    public SmtpConfiguration getEffectiveConfiguration(UUID companyId) {
        // Try company-specific configuration first
        if (companyId != null) {
            Optional<SmtpConfiguration> companyConfig = smtpConfigurationRepository
                    .findByCompanyIdAndIsActiveTrue(companyId);
            if (companyConfig.isPresent()) {
                log.debug("Using company-specific SMTP configuration for company {}", companyId);
                return companyConfig.get();
            }
        }
        
        // Try global configuration
        Optional<SmtpConfiguration> globalConfig = smtpConfigurationRepository.findGlobalConfiguration();
        if (globalConfig.isPresent()) {
            log.debug("Using global SMTP configuration from database");
            return globalConfig.get();
        }
        
        // Fallback to environment variables
        log.debug("Using SMTP configuration from environment variables");
        return createDefaultConfiguration();
    }
    
    /**
     * Get configuration from database or null if using environment variables
     */
    public SmtpConfiguration getDatabaseConfiguration() {
        return smtpConfigurationRepository.findGlobalConfiguration().orElse(null);
    }
    
    /**
     * Save SMTP configuration to database
     */
    @Transactional
    public SmtpConfiguration saveConfiguration(SmtpConfiguration config) {
        if (config.getId() == null) {
            log.info("Creating new SMTP configuration");
        } else {
            log.info("Updating SMTP configuration with ID: {}", config.getId());
        }
        
        // Ensure only one global configuration is active
        if (config.getCompanyId() == null) {
            smtpConfigurationRepository.findGlobalConfiguration().ifPresent(existingConfig -> {
                if (!existingConfig.getId().equals(config.getId())) {
                    existingConfig.setIsActive(false);
                    smtpConfigurationRepository.save(existingConfig);
                }
            });
        }
        
        return smtpConfigurationRepository.save(config);
    }
    
    /**
     * Test SMTP connection with given configuration
     * Returns array: [success, errorMessage]
     */
    public Object[] testConnection(SmtpConfiguration config) {
        try {
            log.debug("Testing SMTP connection to {}:{}", config.getSmtpHost(), config.getSmtpPort());
            JavaMailSenderImpl mailSender = createMailSender(config);
            mailSender.testConnection();
            log.info("SMTP connection test successful for host: {}", config.getSmtpHost());
            return new Object[]{true, "Connection successful"};
        } catch (Exception e) {
            log.error("SMTP connection test failed for host: {} - Error: {}", config.getSmtpHost(), e.getMessage(), e);
            return new Object[]{false, e.getMessage()};
        }
    }
    
    /**
     * Create JavaMailSender from configuration
     */
    public JavaMailSenderImpl createMailSender(SmtpConfiguration config) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getSmtpHost());
        mailSender.setPort(config.getSmtpPort());
        
        if (config.getSmtpUsername() != null && !config.getSmtpUsername().isBlank()) {
            mailSender.setUsername(config.getSmtpUsername());
        }
        if (config.getSmtpPassword() != null && !config.getSmtpPassword().isBlank()) {
            mailSender.setPassword(config.getSmtpPassword());
        }
        
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", config.getSmtpUsername() != null && !config.getSmtpUsername().isBlank());
        props.put("mail.smtp.starttls.enable", config.getUseTls());
        props.put("mail.smtp.ssl.enable", config.getUseSsl());
        props.put("mail.debug", "false");
        
        return mailSender;
    }
    
    /**
     * Create default configuration from environment variables
     */
    private SmtpConfiguration createDefaultConfiguration() {
        SmtpConfiguration config = new SmtpConfiguration();
        config.setSmtpHost(defaultSmtpHost);
        config.setSmtpPort(defaultSmtpPort);
        config.setSmtpUsername(defaultSmtpUsername);
        config.setSmtpPassword(defaultSmtpPassword);
        config.setEmailFrom(defaultEmailFrom);
        config.setEmailFromName(defaultEmailFromName);
        config.setUseTls(true);
        config.setUseSsl(false);
        config.setIsActive(true);
        return config;
    }
}
