package com.erp.templates.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {
    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    public String uploadPdf(Path filePath, UUID templateId, String templateKey) {
        try {
            String key = String.format("templates/%s/%s-%d.pdf", templateId, templateKey, System.currentTimeMillis());
            byte[] fileContent = Files.readAllBytes(filePath);

            s3Client.putObject(
                PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType("application/pdf")
                    .build(),
                RequestBody.fromBytes(fileContent)
            );

            Files.delete(filePath);

            String urlBase = endpoint.isEmpty() 
                ? String.format("https://%s.s3.amazonaws.com", bucketName)
                : endpoint;
            return String.format("%s/%s", urlBase, key);
        } catch (IOException e) {
            log.error("Error uploading PDF to S3", e);
            throw new RuntimeException("Failed to upload PDF", e);
        }
    }
}
