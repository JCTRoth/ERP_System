package com.erp.templates.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RenderResult {
    private String html;
    private String pdfUrl;
    private String[] errors;
}
