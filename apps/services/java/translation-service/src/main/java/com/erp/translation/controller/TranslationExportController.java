package com.erp.translation.controller;

import com.erp.translation.service.TranslationExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/translations")
@RequiredArgsConstructor
@Tag(name = "Translation Export", description = "Export translations to various formats")
public class TranslationExportController {

    private final TranslationExportService exportService;

    @GetMapping("/export/excel")
    @Operation(summary = "Export to Excel", description = "Export all translations to Excel format")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam(required = false) String namespace) {
        byte[] data = exportService.exportToExcel(namespace);
        
        String filename = namespace != null 
                ? "translations_" + namespace + ".xlsx" 
                : "translations.xlsx";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export to CSV", description = "Export all translations to CSV format")
    public ResponseEntity<byte[]> exportToCsv(@RequestParam(required = false) String namespace) {
        byte[] data = exportService.exportToCsv(namespace);
        
        String filename = namespace != null 
                ? "translations_" + namespace + ".csv" 
                : "translations.csv";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }

    @GetMapping("/export/json/{language}")
    @Operation(summary = "Export to JSON", description = "Export translations for a specific language to JSON format")
    public ResponseEntity<String> exportToJson(
            @PathVariable String language,
            @RequestParam(required = false) String namespace) {
        
        String json = exportService.exportToJson(language, namespace);
        
        String filename = namespace != null 
                ? language + "_" + namespace + ".json" 
                : language + ".json";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json);
    }
}
