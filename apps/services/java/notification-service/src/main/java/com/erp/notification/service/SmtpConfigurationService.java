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
    
    @Value("${notification.email.from:noreply@erp-system.local}")
    private String defaultEmailFrom;
    
    @Value("${notification.email.from-name:ERP System}")
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
     * Send test email with given configuration
     */
    public void sendTestEmail(SmtpConfiguration config, String testEmailAddress) {
        try {
            log.info("Sending test email to: {}", testEmailAddress);

            JavaMailSenderImpl mailSender = createMailSender(config);

            // Create test email
            org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
            message.setFrom(config.getEmailFrom());
            message.setTo(testEmailAddress);
            message.setSubject("ERP System - SMTP Test Email");
            message.setText("This is a test email from your ERP System.\n\nIf you received this email, your SMTP configuration is working correctly.\n\nSent at: " + java.time.LocalDateTime.now());

            try {
                mailSender.send(message);
                log.info("Test email sent successfully to: {}", testEmailAddress);
            } catch (Exception sendEx) {
                log.warn("Initial send failed: {}", sendEx.getMessage());

                // Some SMTP providers reject arbitrary From addresses. Retry using the SMTP username as sender
                String smtpUser = mailSender.getUsername();
                if (smtpUser != null && !smtpUser.isBlank() && !smtpUser.equalsIgnoreCase(config.getEmailFrom())) {
                    log.info("Retrying test email using SMTP username as From: {}", smtpUser);
                    message.setFrom(smtpUser);
                    try {
                        mailSender.send(message);
                        log.info("Test email sent successfully to: {} using fallback From: {}", testEmailAddress, smtpUser);
                        return;
                    } catch (Exception retryEx) {
                        log.error("Fallback send also failed: {}", retryEx.getMessage(), retryEx);
                        throw new RuntimeException("Failed to send test email: " + retryEx.getMessage(), retryEx);
                    }
                }

                // No fallback available or retry failed
                throw new RuntimeException("Failed to send test email: " + sendEx.getMessage(), sendEx);
            }

        } catch (Exception e) {
            log.error("Failed to send test email to: {} - Error: {}", testEmailAddress, e.getMessage(), e);
            throw new RuntimeException("Failed to send test email: " + e.getMessage(), e);
        }
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
