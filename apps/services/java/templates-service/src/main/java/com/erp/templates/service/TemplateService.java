package com.erp.templates.service;

import com.erp.templates.dto.RenderResult;
import com.erp.templates.dto.TemplateDTO;
import com.erp.templates.entity.Template;
import com.erp.templates.repository.TemplateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.asciidoctor.Asciidoctor;
import org.asciidoctor.AttributesBuilder;
import org.asciidoctor.OptionsBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateService {
    private final TemplateRepository templateRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final Asciidoctor asciidoctor = Asciidoctor.Factory.create();

    @Transactional
    public TemplateDTO createTemplate(String title, String key, String content, String language,
                                      String documentType, String assignedState, UUID companyId, UUID createdBy) {
        Template template = Template.builder()
            .title(title)
            .key(key)
            .content(content)
            .language(language)
            .documentType(documentType)
            .assignedState(assignedState)
            .companyId(companyId)
            .createdBy(createdBy)
            .isActive(true)
            .build();

        Template saved = templateRepository.save(template);
        return toDTO(saved);
    }

    @Transactional
    public TemplateDTO updateTemplate(UUID id, String title, String content, String language,
                                      String documentType, String assignedState, Boolean isActive) {
        Template template = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + id));

        template.setTitle(title != null ? title : template.getTitle());
        template.setContent(content != null ? content : template.getContent());
        template.setLanguage(language != null ? language : template.getLanguage());
        template.setDocumentType(documentType != null ? documentType : template.getDocumentType());
        template.setAssignedState(assignedState != null ? assignedState : template.getAssignedState());
        template.setIsActive(isActive != null ? isActive : template.getIsActive());

        Template updated = templateRepository.save(template);
        return toDTO(updated);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        templateRepository.deleteById(id);
    }

    public TemplateDTO getTemplate(UUID id) {
        Template template = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + id));
        return toDTO(template);
    }

    public List<TemplateDTO> getAllTemplates() {
        return templateRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public TemplateDTO getTemplateByKey(String key, String language) {
        Template template = templateRepository.findByKeyAndLanguage(key, language)
            .orElse(null);
        return template != null ? toDTO(template) : null;
    }

    public RenderResult renderTemplate(UUID templateId, String contextJson) {
        Template template = templateRepository.findById(templateId)
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateId));

        return renderAsciiDoc(template, contextJson);
    }

    public RenderResult renderTemplateByKey(String templateKey, String language, String contextJson) {
        Template template = templateRepository.findByKeyAndLanguageAndIsActive(templateKey, language, true)
            .orElseThrow(() -> new IllegalArgumentException("Active template not found: " + templateKey + " [" + language + "]"));

        return renderAsciiDoc(template, contextJson);
    }

    private RenderResult renderAsciiDoc(Template template, String contextJson) {
        try {
            String adocContent = interpolateTemplate(template.getContent(), contextJson);
            
            // Convert to HTML
            String html = asciidoctor.convert(adocContent, OptionsBuilder.options()
                .backend("html5")
                .asMap());

            // Try to convert to PDF
            String pdfUrl = null;
            try {
                Path pdfPath = Files.createTempFile("template_", ".pdf");
                
                // Convert AsciiDoc to PDF bytes
                Object pdfResult = asciidoctor.convert(adocContent, OptionsBuilder.options()
                    .backend("pdf")
                    .asMap());
                
                byte[] pdfBytes;
                if (pdfResult instanceof byte[]) {
                    pdfBytes = (byte[]) pdfResult;
                } else if (pdfResult instanceof String) {
                    pdfBytes = ((String) pdfResult).getBytes();
                } else {
                    throw new RuntimeException("Unexpected PDF result type: " + pdfResult.getClass());
                }
                
                // Write PDF bytes to file
                Files.write(pdfPath, pdfBytes);

                // Check if PDF file was actually created and has content
                if (Files.exists(pdfPath) && Files.size(pdfPath) > 0) {
                    pdfUrl = storageService.uploadPdf(pdfPath, template.getId(), template.getKey());
                } else {
                    log.warn("PDF file was not created or is empty for template: {}", template.getId());
                }
            } catch (Exception pdfException) {
                log.warn("PDF generation failed for template: {}, error: {}", template.getId(), pdfException.getMessage());
            }

            return RenderResult.builder()
                .html(html)
                .pdfUrl(pdfUrl)
                .build();
        } catch (Exception e) {
            log.error("Error rendering template: {}", template.getId(), e);
            return RenderResult.builder()
                .errors(new String[]{"Rendering failed: " + e.getMessage()})
                .build();
        }
    }

    private String interpolateTemplate(String template, String contextJson) throws IOException {
        JsonNode context = objectMapper.readTree(contextJson);
        String result = template;

        // Replace simple variables: {{variable_name}} with values from context
        Iterator<String> fieldNames = context.fieldNames();
        while (fieldNames.hasNext()) {
            String fieldName = fieldNames.next();
            JsonNode value = context.get(fieldName);
            String placeholder = "{{" + fieldName + "}}";
            result = result.replace(placeholder, value.asText());
        }

        return result;
    }

    public Map<String, Object> getAvailableVariables() {
        return Map.ofEntries(
            Map.entry("order", Map.of(
                "fields", List.of(
                    "id", "orderNumber", "createdAt", "updatedAt", "status", "notes",
                    "subtotal", "taxAmount", "shippingAmount", "discountAmount", "total"
                ),
                "nested", Map.of(
                    "items", List.of("productName", "productSku", "quantity", "unitPrice", "total"),
                    "customer", List.of("name", "email", "phone"),
                    "shippingAddress", List.of("street", "city", "postalCode", "country"),
                    "billingAddress", List.of("street", "city", "postalCode", "country")
                )
            )),
            Map.entry("company", Map.of(
                "fields", List.of("name", "address", "vatNumber", "email", "phone")
            )),
            Map.entry("invoice", Map.of(
                "fields", List.of("number", "issueDate", "dueDate", "subtotal", "tax", "total", "status")
            ))
        );
    }

    private TemplateDTO toDTO(Template template) {
        return TemplateDTO.builder()
            .id(template.getId())
            .companyId(template.getCompanyId())
            .title(template.getTitle())
            .key(template.getKey())
            .content(template.getContent())
            .language(template.getLanguage())
            .documentType(template.getDocumentType())
            .assignedState(template.getAssignedState())
            .isActive(template.getIsActive())
            .createdBy(template.getCreatedBy())
            .createdAt(template.getCreatedAt())
            .updatedAt(template.getUpdatedAt())
            .metadata(template.getMetadata())
            .build();
    }
}
