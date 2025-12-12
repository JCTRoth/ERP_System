package com.erp.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogoUploadResponse {
    private String originalUrl;
    private Map<String, String> resizedUrls;
    private long fileSizeBytes;
    private String mimeType;
}
