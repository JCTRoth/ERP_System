package com.erp.translation.service;

import com.erp.translation.dto.TranslationBundleDto;
import com.opencsv.CSVWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranslationExportService {

    private final TranslationService translationService;
    private final LanguageConfigService languageConfigService;

    public byte[] exportToExcel(String namespace) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Translations");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Get all language codes
            List<String> languageCodes = languageConfigService.getAvailableLanguages().stream()
                    .map(lang -> lang.getCode())
                    .toList();

            // Create header row
            Row headerRow = sheet.createRow(0);
            Cell keyCell = headerRow.createCell(0);
            keyCell.setCellValue("Key");
            keyCell.setCellStyle(headerStyle);

            for (int i = 0; i < languageCodes.size(); i++) {
                Cell cell = headerRow.createCell(i + 1);
                cell.setCellValue(languageCodes.get(i).toUpperCase());
                cell.setCellStyle(headerStyle);
            }

            // Get translations for each language
            Map<String, Map<String, String>> allTranslations = new java.util.HashMap<>();
            java.util.Set<String> allKeys = new java.util.TreeSet<>();

            for (String langCode : languageCodes) {
                TranslationBundleDto bundle = translationService.getTranslationBundle(langCode, null, namespace);
                allTranslations.put(langCode, bundle.getTranslations());
                allKeys.addAll(bundle.getTranslations().keySet());
            }

            // Write data rows
            int rowNum = 1;
            for (String key : allKeys) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(key);

                for (int i = 0; i < languageCodes.size(); i++) {
                    String value = allTranslations.get(languageCodes.get(i)).get(key);
                    row.createCell(i + 1).setCellValue(value != null ? value : "");
                }
            }

            // Auto-size columns
            for (int i = 0; i <= languageCodes.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Failed to export translations to Excel", e);
            throw new RuntimeException("Failed to export translations", e);
        }
    }

    public byte[] exportToCsv(String namespace) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             OutputStreamWriter osw = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
             CSVWriter writer = new CSVWriter(osw)) {

            List<String> languageCodes = languageConfigService.getAvailableLanguages().stream()
                    .map(lang -> lang.getCode())
                    .toList();

            // Write header
            String[] header = new String[languageCodes.size() + 1];
            header[0] = "Key";
            for (int i = 0; i < languageCodes.size(); i++) {
                header[i + 1] = languageCodes.get(i).toUpperCase();
            }
            writer.writeNext(header);

            // Get translations
            Map<String, Map<String, String>> allTranslations = new java.util.HashMap<>();
            java.util.Set<String> allKeys = new java.util.TreeSet<>();

            for (String langCode : languageCodes) {
                TranslationBundleDto bundle = translationService.getTranslationBundle(langCode, null, namespace);
                allTranslations.put(langCode, bundle.getTranslations());
                allKeys.addAll(bundle.getTranslations().keySet());
            }

            // Write data
            for (String key : allKeys) {
                String[] row = new String[languageCodes.size() + 1];
                row[0] = key;

                for (int i = 0; i < languageCodes.size(); i++) {
                    String value = allTranslations.get(languageCodes.get(i)).get(key);
                    row[i + 1] = value != null ? value : "";
                }
                writer.writeNext(row);
            }

            writer.flush();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Failed to export translations to CSV", e);
            throw new RuntimeException("Failed to export translations", e);
        }
    }

    @SuppressWarnings("unchecked")
    public String exportToJson(String language, String namespace) {
        TranslationBundleDto bundle = translationService.getTranslationBundle(language, null, namespace);
        
        // Convert flat keys to nested JSON structure
        Map<String, Object> nested = new java.util.LinkedHashMap<>();
        
        for (Map.Entry<String, String> entry : bundle.getTranslations().entrySet()) {
            String[] parts = entry.getKey().split("\\.");
            Map<String, Object> current = nested;
            
            for (int i = 0; i < parts.length - 1; i++) {
                current = (Map<String, Object>) current.computeIfAbsent(parts[i], 
                        k -> new java.util.LinkedHashMap<String, Object>());
            }
            current.put(parts[parts.length - 1], entry.getValue());
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.enable(com.fasterxml.jackson.databind.SerializationFeature.INDENT_OUTPUT);
            return mapper.writeValueAsString(nested);
        } catch (Exception e) {
            log.error("Failed to export translations to JSON", e);
            throw new RuntimeException("Failed to export translations", e);
        }
    }
}
