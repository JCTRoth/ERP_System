package com.erp.templates.controller;

import com.erp.templates.dto.RenderResult;
import com.erp.templates.dto.TemplateDTO;
import com.erp.templates.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {
    private final TemplateService templateService;

    @GetMapping
    public ResponseEntity<List<TemplateDTO>> getAllTemplates() {
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TemplateDTO> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.getTemplate(id));
    }

    @GetMapping("/key/{key}")
    public ResponseEntity<TemplateDTO> getTemplateByKey(@PathVariable String key, @RequestParam(defaultValue = "en") String language) {
        TemplateDTO dto = templateService.getTemplateByKey(key, language);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<TemplateDTO> createTemplate(
            @RequestParam String title,
            @RequestParam String key,
            @RequestBody String content,
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String assignedState,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) UUID createdBy) {
        
        TemplateDTO dto = templateService.createTemplate(title, key, content, language, documentType, assignedState, companyId, createdBy);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TemplateDTO> updateTemplate(
            @PathVariable UUID id,
            @RequestParam(required = false) String title,
            @RequestBody(required = false) String content,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String assignedState,
            @RequestParam(required = false) Boolean isActive) {
        
        TemplateDTO dto = templateService.updateTemplate(id, title, content, language, documentType, assignedState, isActive);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/render")
    public ResponseEntity<RenderResult> renderTemplate(
            @PathVariable UUID id,
            @RequestBody String contextJson) {
        
        RenderResult result = templateService.renderTemplate(id, contextJson);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/render-by-key")
    public ResponseEntity<RenderResult> renderTemplateByKey(
            @RequestParam String key,
            @RequestParam(defaultValue = "en") String language,
            @RequestBody String contextJson) {
        
        RenderResult result = templateService.renderTemplateByKey(key, language, contextJson);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/variables")
    public ResponseEntity<Map<String, Object>> getAvailableVariables() {
        return ResponseEntity.ok(templateService.getAvailableVariables());
    }
}
