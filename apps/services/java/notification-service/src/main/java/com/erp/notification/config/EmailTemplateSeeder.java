package com.erp.notification.config;

import com.erp.notification.entity.EmailTemplate;
import com.erp.notification.repository.EmailTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;

/**
 * Seeds the default email templates (welcome / password-reset / order-confirmation
 * for EN, DE, FR, RU) from a JSON resource instead of a SQL migration.
 * <p>
 * Idempotent: templates are only inserted when no template with the same
 * name + language combination exists yet.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateSeeder implements ApplicationRunner {

    private static final String SEED_FILE = "seed/email-templates.json";

    private final EmailTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void run(ApplicationArguments args) throws Exception {
        ClassPathResource resource = new ClassPathResource(SEED_FILE);
        if (!resource.exists()) {
            log.warn("Seed file {} not found on classpath — skipping email template seeding", SEED_FILE);
            return;
        }

        List<TemplateSeed> seeds;
        try (InputStream in = resource.getInputStream()) {
            seeds = objectMapper.readValue(in, new TypeReference<List<TemplateSeed>>() { });
        }

        int created = 0;
        for (TemplateSeed seed : seeds) {
            if (templateRepository.findByNameAndLanguage(seed.name(), seed.language()).isPresent()) {
                continue;
            }
            EmailTemplate template = EmailTemplate.builder()
                    .name(seed.name())
                    .subject(seed.subject())
                    .bodyHtml(seed.bodyHtml())
                    .bodyText(seed.bodyText())
                    .language(seed.language())
                    .description(seed.description())
                    .isActive(true)
                    .build();
            templateRepository.save(template);
            created++;
        }

        log.info("Email template seeding complete ({} new template(s) from {})", created, SEED_FILE);
    }

    public record TemplateSeed(
            String name,
            String subject,
            String bodyHtml,
            String bodyText,
            String language,
            String description
    ) {}
}
