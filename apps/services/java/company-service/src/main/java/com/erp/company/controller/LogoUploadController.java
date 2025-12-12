package com.erp.company.controller;

import com.erp.company.dto.LogoUploadResponse;
import com.erp.company.service.CompanyService;
import com.erp.company.service.LogoUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@Tag(name = "Company Logo", description = "Company logo upload operations")
public class LogoUploadController {

    private final LogoUploadService logoUploadService;
    private final CompanyService companyService;

    @PostMapping(value = "/{companyId}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload company logo", description = "Uploads a company logo and generates multiple sizes")
    public ResponseEntity<LogoUploadResponse> uploadLogo(
            @PathVariable UUID companyId,
            @RequestParam("file") MultipartFile file) {
        
        LogoUploadResponse response = logoUploadService.uploadLogo(companyId, file);
        companyService.updateCompanyLogo(companyId, response.getOriginalUrl());
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{companyId}/logo")
    @Operation(summary = "Delete company logo", description = "Deletes all logo files for a company")
    public ResponseEntity<Void> deleteLogo(@PathVariable UUID companyId) {
        logoUploadService.deleteLogo(companyId);
        companyService.updateCompanyLogo(companyId, null);
        
        return ResponseEntity.noContent().build();
    }
}
