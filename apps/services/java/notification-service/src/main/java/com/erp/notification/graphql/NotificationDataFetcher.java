package com.erp.notification.graphql;

import com.erp.notification.entity.EmailNotification;
import com.erp.notification.entity.EmailTemplate;
import com.erp.notification.service.EmailService;
import com.erp.notification.service.EmailTemplateService;
import com.netflix.graphql.dgs.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class NotificationDataFetcher {
    
    private final EmailService emailService;
    private final EmailTemplateService templateService;
    
    @DgsQuery
    public EmailNotification notification(@InputArgument String id) {
        return emailService.findById(UUID.fromString(id)).orElse(null);
    }
    
    @DgsQuery
    public List<EmailNotification> notificationsByCompany(
            @InputArgument String companyId,
            @InputArgument Integer page,
            @InputArgument Integer size
    ) {
        PageRequest pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<EmailNotification> result = emailService.findByCompany(UUID.fromString(companyId), pageable);
        return result.getContent();
    }
    
    @DgsQuery
    public List<EmailNotification> notificationsByUser(
            @InputArgument String userId,
            @InputArgument Integer page,
            @InputArgument Integer size
    ) {
        PageRequest pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<EmailNotification> result = emailService.findByUser(UUID.fromString(userId), pageable);
        return result.getContent();
    }
    
    @DgsQuery
    public List<EmailTemplate> emailTemplates() {
        return templateService.findAll();
    }
    
    @DgsQuery
    public EmailTemplate emailTemplate(@InputArgument String id) {
        return templateService.findById(UUID.fromString(id)).orElse(null);
    }
    
    @DgsMutation
    public EmailNotification sendEmail(@InputArgument Map<String, Object> input) {
        return emailService.sendEmail(new EmailService.SendEmailRequest(
                input.get("companyId") != null ? UUID.fromString((String) input.get("companyId")) : null,
                input.get("userId") != null ? UUID.fromString((String) input.get("userId")) : null,
                (String) input.get("toEmail"),
                (String) input.get("toName"),
                (String) input.get("subject"),
                (String) input.get("templateName"),
                (Map<String, Object>) input.get("templateData"),
                (String) input.get("bodyHtml"),
                (String) input.get("bodyText"),
                (String) input.get("language")
        ));
    }
    
    @DgsMutation
    public EmailTemplate createEmailTemplate(@InputArgument Map<String, Object> input) {
        return templateService.create(new EmailTemplateService.CreateTemplateRequest(
                input.get("companyId") != null ? UUID.fromString((String) input.get("companyId")) : null,
                (String) input.get("name"),
                (String) input.get("subject"),
                (String) input.get("bodyHtml"),
                (String) input.get("bodyText"),
                (String) input.get("language"),
                (String) input.get("description")
        ));
    }
    
    @DgsMutation
    public EmailTemplate updateEmailTemplate(
            @InputArgument String id,
            @InputArgument Map<String, Object> input
    ) {
        return templateService.update(UUID.fromString(id), new EmailTemplateService.UpdateTemplateRequest(
                (String) input.get("subject"),
                (String) input.get("bodyHtml"),
                (String) input.get("bodyText"),
                (String) input.get("description"),
                (Boolean) input.get("isActive")
        )).orElse(null);
    }
    
    @DgsMutation
    public Boolean deleteEmailTemplate(@InputArgument String id) {
        return templateService.delete(UUID.fromString(id));
    }
}
