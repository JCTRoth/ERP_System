package com.erp.notification.service;

import com.erp.notification.entity.EmailTemplate;
import com.erp.notification.repository.EmailTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateService {
    
    private final EmailTemplateRepository templateRepository;
    
    public List<EmailTemplate> findAll() {
        return templateRepository.findAll();
    }
    
    public List<EmailTemplate> findGlobalTemplates() {
        return templateRepository.findByCompanyIdIsNull();
    }
    
    public List<EmailTemplate> findByCompany(UUID companyId) {
        return templateRepository.findByCompanyId(companyId);
    }
    
    public Optional<EmailTemplate> findById(UUID id) {
        return templateRepository.findById(id);
    }
    
    public Optional<EmailTemplate> findByNameAndLanguage(String name, String language) {
        return templateRepository.findByNameAndLanguage(name, language);
    }
    
    @Transactional
    public EmailTemplate create(CreateTemplateRequest request) {
        log.info("Creating email template: {}", request.name());
        
        EmailTemplate template = EmailTemplate.builder()
                .companyId(request.companyId())
                .name(request.name())
                .subject(request.subject())
                .bodyHtml(request.bodyHtml())
                .bodyText(request.bodyText())
                .language(request.language() != null ? request.language() : "en")
                .description(request.description())
                .isActive(true)
                .build();
        
        return templateRepository.save(template);
    }
    
    @Transactional
    public Optional<EmailTemplate> update(UUID id, UpdateTemplateRequest request) {
        return templateRepository.findById(id).map(template -> {
            if (request.subject() != null) {
                template.setSubject(request.subject());
            }
            if (request.bodyHtml() != null) {
                template.setBodyHtml(request.bodyHtml());
            }
            if (request.bodyText() != null) {
                template.setBodyText(request.bodyText());
            }
            if (request.description() != null) {
                template.setDescription(request.description());
            }
            if (request.isActive() != null) {
                template.setActive(request.isActive());
            }
            return templateRepository.save(template);
        });
    }
    
    @Transactional
    public boolean delete(UUID id) {
        if (templateRepository.existsById(id)) {
            templateRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    public record CreateTemplateRequest(
            UUID companyId,
            String name,
            String subject,
            String bodyHtml,
            String bodyText,
            String language,
            String description
    ) {}
    
    public record UpdateTemplateRequest(
            String subject,
            String bodyHtml,
            String bodyText,
            String description,
            Boolean isActive
    ) {}
}
