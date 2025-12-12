package com.erp.edifact.controller;

import com.erp.edifact.entity.EdifactMessage;
import com.erp.edifact.service.EdifactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/edifact")
@RequiredArgsConstructor
public class EdifactController {
    
    private final EdifactService edifactService;
    
    @PostMapping("/upload")
    public ResponseEntity<EdifactMessage> uploadEdifact(
            @RequestParam("file") MultipartFile file,
            @RequestParam("companyId") UUID companyId,
            @RequestParam(value = "userId", required = false) UUID userId
    ) throws Exception {
        EdifactMessage message = edifactService.processInbound(companyId, file, userId);
        return ResponseEntity.ok(message);
    }
    
    @GetMapping("/download/{messageId}")
    public ResponseEntity<byte[]> downloadEdifact(@PathVariable UUID messageId) throws Exception {
        EdifactMessage message = edifactService.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        
        byte[] content = edifactService.downloadFile(messageId);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + (message.getOriginalFilename() != null ? 
                                message.getOriginalFilename() : message.getId() + ".edi") + "\"")
                .contentType(MediaType.parseMediaType("application/edifact"))
                .body(content);
    }
}
