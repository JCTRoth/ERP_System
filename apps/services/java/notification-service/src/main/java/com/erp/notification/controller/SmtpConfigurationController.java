package com.erp.notification.controller;

import com.erp.notification.entity.SmtpConfiguration;
import com.erp.notification.service.SmtpConfigurationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/smtp-configuration")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "false")
public class SmtpConfigurationController {
    
    private final SmtpConfigurationService smtpConfigurationService;
    
    /**
     * Get SMTP configuration
     * Returns database configuration if exists, otherwise returns configuration from environment variables
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfiguration() {
        try {
            SmtpConfiguration dbConfig = smtpConfigurationService.getDatabaseConfiguration();
            SmtpConfiguration effectiveConfig = smtpConfigurationService.getEffectiveConfiguration(null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("config", sanitizeConfiguration(effectiveConfig));
            response.put("source", dbConfig != null ? "database" : "environment");
            response.put("hasDbConfig", dbConfig != null);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching SMTP configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Save SMTP configuration
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveConfiguration(@RequestBody SmtpConfiguration config) {
        try {
            log.info("Saving SMTP configuration: host={}, port={}, username={}", 
                config.getSmtpHost(), config.getSmtpPort(), config.getSmtpUsername());
            
            // Validate required fields
            if (config.getSmtpHost() == null || config.getSmtpHost().isBlank()) {
                throw new IllegalArgumentException("SMTP Host is required");
            }
            if (config.getEmailFrom() == null || config.getEmailFrom().isBlank()) {
                throw new IllegalArgumentException("Email From is required");
            }
            if (config.getSmtpPort() == null || config.getSmtpPort() <= 0) {
                throw new IllegalArgumentException("SMTP Port must be valid");
            }
            
            // Set company ID to null for global configuration
            config.setCompanyId(null);
            config.setIsActive(true);
            
            SmtpConfiguration saved = smtpConfigurationService.saveConfiguration(config);
            log.info("SMTP configuration saved successfully with ID: {}", saved.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("config", sanitizeConfiguration(saved));
            response.put("message", "Configuration saved successfully");
            response.put("success", true);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Validation error saving SMTP configuration: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Validation error");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            log.error("Error saving SMTP configuration", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to save configuration");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * Test SMTP connection
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestBody SmtpConfiguration config) {
        try {
            Object[] result = smtpConfigurationService.testConnection(config);
            boolean success = (boolean) result[0];
            String message = (String) result[1];
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", message);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error testing SMTP connection", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Connection test failed: " + e.getMessage());
            return ResponseEntity.ok(errorResponse);
        }
    }
    
    /**
     * Send test email
     */
    @PostMapping("/test-email")
    public ResponseEntity<Map<String, Object>> sendTestEmail(@RequestBody Map<String, Object> request) {
        try {
            log.info("Sending test email with request: {}", request);
            
            // Extract SMTP config from request
            SmtpConfiguration config = new SmtpConfiguration();
            config.setSmtpHost((String) request.get("smtpHost"));
            config.setSmtpPort(((Number) request.get("smtpPort")).intValue());
            config.setSmtpUsername((String) request.get("smtpUsername"));
            config.setSmtpPassword((String) request.get("smtpPassword"));
            config.setEmailFrom((String) request.get("emailFrom"));
            config.setEmailFromName((String) request.get("emailFromName"));
            config.setUseTls((Boolean) request.getOrDefault("useTls", true));
            config.setUseSsl((Boolean) request.getOrDefault("useSsl", false));
            
            String testEmailAddress = (String) request.get("testEmailAddress");
            
            if (testEmailAddress == null || testEmailAddress.trim().isEmpty()) {
                throw new IllegalArgumentException("Test email address is required");
            }
            
            log.info("Sending test email to: {}", testEmailAddress);
            
            // Send test email
            smtpConfigurationService.sendTestEmail(config, testEmailAddress.trim());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test email sent successfully");
            
            log.info("Test email sent successfully to: {}", testEmailAddress);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("Validation error sending test email: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            log.warn("SMTP configuration error sending test email: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to send test email: " + e.getMessage());
            // Return 422 for SMTP/configuration errors (not a server error, but unprocessable request)
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errorResponse);
        }
    }
    
    /**
     * Remove password from response for security
     */
    private SmtpConfiguration sanitizeConfiguration(SmtpConfiguration config) {
        if (config == null) return null;
        
        SmtpConfiguration sanitized = new SmtpConfiguration();
        sanitized.setId(config.getId());
        sanitized.setCompanyId(config.getCompanyId());
        sanitized.setSmtpHost(config.getSmtpHost());
        sanitized.setSmtpPort(config.getSmtpPort());
        sanitized.setSmtpUsername(config.getSmtpUsername());
        // Don't return password
        sanitized.setSmtpPassword(config.getSmtpPassword() != null && !config.getSmtpPassword().isEmpty() ? "***" : null);
        sanitized.setEmailFrom(config.getEmailFrom());
        sanitized.setEmailFromName(config.getEmailFromName());
        sanitized.setUseTls(config.getUseTls());
        sanitized.setUseSsl(config.getUseSsl());
        sanitized.setIsActive(config.getIsActive());
        sanitized.setCreatedAt(config.getCreatedAt());
        sanitized.setUpdatedAt(config.getUpdatedAt());
        
        return sanitized;
    }
}
