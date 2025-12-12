package com.erp.notification.service;

import com.erp.notification.entity.EmailNotification;
import com.erp.notification.entity.EmailNotification.NotificationStatus;
import com.erp.notification.entity.EmailTemplate;
import com.erp.notification.repository.EmailNotificationRepository;
import com.erp.notification.repository.EmailTemplateRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    private final EmailNotificationRepository notificationRepository;
    private final EmailTemplateRepository templateRepository;
    private final TemplateEngine templateEngine;
    private final ObjectMapper objectMapper;
    
    @Value("${notification.email.from}")
    private String fromEmail;
    
    @Value("${notification.email.from-name}")
    private String fromName;
    
    @Value("${notification.email.retry-attempts:3}")
    private int maxRetryAttempts;
    
    @Transactional
    public EmailNotification sendEmail(SendEmailRequest request) {
        log.info("Creating email notification to: {}", request.toEmail());
        
        // Create notification record
        EmailNotification notification = EmailNotification.builder()
                .companyId(request.companyId())
                .userId(request.userId())
                .toEmail(request.toEmail())
                .toName(request.toName())
                .subject(request.subject())
                .templateName(request.templateName())
                .templateData(serializeTemplateData(request.templateData()))
                .bodyHtml(request.bodyHtml())
                .bodyText(request.bodyText())
                .status(NotificationStatus.PENDING)
                .retryCount(0)
                .build();
        
        notification = notificationRepository.save(notification);
        
        // Process template if specified
        if (request.templateName() != null) {
            processTemplate(notification, request.templateData(), request.language());
        }
        
        // Send asynchronously
        sendEmailAsync(notification.getId());
        
        return notification;
    }
    
    @Async
    public void sendEmailAsync(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(this::doSendEmail);
    }
    
    @Transactional
    public void doSendEmail(EmailNotification notification) {
        try {
            notification.setStatus(NotificationStatus.SENDING);
            notificationRepository.save(notification);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, fromName);
            helper.setTo(notification.getToEmail());
            helper.setSubject(notification.getSubject());
            
            if (notification.getBodyHtml() != null) {
                helper.setText(
                        notification.getBodyText() != null ? notification.getBodyText() : "",
                        notification.getBodyHtml()
                );
            } else if (notification.getBodyText() != null) {
                helper.setText(notification.getBodyText(), false);
            }
            
            mailSender.send(message);
            
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(OffsetDateTime.now());
            notificationRepository.save(notification);
            
            log.info("Email sent successfully to: {}", notification.getToEmail());
            
        } catch (Exception e) {
            log.error("Failed to send email to: {}", notification.getToEmail(), e);
            handleSendError(notification, e);
        }
    }
    
    private void handleSendError(EmailNotification notification, Exception e) {
        notification.setRetryCount(notification.getRetryCount() + 1);
        notification.setErrorMessage(e.getMessage());
        
        if (notification.getRetryCount() >= maxRetryAttempts) {
            notification.setStatus(NotificationStatus.FAILED);
            log.error("Email permanently failed after {} attempts: {}", maxRetryAttempts, notification.getId());
        } else {
            notification.setStatus(NotificationStatus.PENDING);
            log.warn("Email will be retried. Attempt {}/{}: {}", 
                    notification.getRetryCount(), maxRetryAttempts, notification.getId());
        }
        
        notificationRepository.save(notification);
    }
    
    private void processTemplate(EmailNotification notification, Map<String, Object> data, String language) {
        String lang = language != null ? language : "en";
        UUID companyId = notification.getCompanyId();
        
        // Find template with company override support
        List<EmailTemplate> templates = templateRepository.findByNameAndCompanyIdOrGlobal(
                notification.getTemplateName(), companyId, lang);
        
        if (templates.isEmpty()) {
            // Try fallback to English
            templates = templateRepository.findByNameAndCompanyIdOrGlobal(
                    notification.getTemplateName(), companyId, "en");
        }
        
        if (!templates.isEmpty()) {
            EmailTemplate template = templates.get(0);
            
            // Process with Thymeleaf
            Context context = new Context();
            if (data != null) {
                data.forEach(context::setVariable);
            }
            
            String processedHtml = templateEngine.process(template.getBodyHtml(), context);
            String processedSubject = templateEngine.process(template.getSubject(), context);
            
            notification.setBodyHtml(processedHtml);
            notification.setSubject(processedSubject);
            
            if (template.getBodyText() != null) {
                String processedText = templateEngine.process(template.getBodyText(), context);
                notification.setBodyText(processedText);
            }
            
            notificationRepository.save(notification);
        } else {
            log.warn("Template not found: {}", notification.getTemplateName());
        }
    }
    
    private String serializeTemplateData(Map<String, Object> data) {
        if (data == null) return null;
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize template data", e);
            return null;
        }
    }
    
    @Scheduled(fixedDelayString = "${notification.email.retry-delay-ms:60000}")
    @Transactional
    public void retryFailedEmails() {
        List<EmailNotification> pending = notificationRepository.findPendingWithRetryLimit(
                NotificationStatus.PENDING, maxRetryAttempts);
        
        for (EmailNotification notification : pending) {
            log.info("Retrying email: {}", notification.getId());
            doSendEmail(notification);
        }
    }
    
    public Optional<EmailNotification> findById(UUID id) {
        return notificationRepository.findById(id);
    }
    
    public Page<EmailNotification> findByCompany(UUID companyId, Pageable pageable) {
        return notificationRepository.findByCompanyId(companyId, pageable);
    }
    
    public Page<EmailNotification> findByUser(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable);
    }
    
    public record SendEmailRequest(
            UUID companyId,
            UUID userId,
            String toEmail,
            String toName,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String bodyHtml,
            String bodyText,
            String language
    ) {}
}
