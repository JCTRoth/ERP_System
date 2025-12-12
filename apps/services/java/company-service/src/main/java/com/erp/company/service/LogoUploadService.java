package com.erp.company.service;

import com.erp.company.dto.LogoUploadResponse;
import com.erp.company.exception.InvalidRequestException;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogoUploadService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name:company-logos}")
    private String bucketName;

    @Value("${app.logo.max-size-bytes:4194304}")
    private long maxSizeBytes;

    @Value("${app.logo.allowed-mime-types:image/png,image/jpeg,image/svg+xml}")
    private List<String> allowedMimeTypes;

    @Value("${app.logo.sizes.sidebar:400}")
    private int sidebarSize;

    @Value("${app.logo.sizes.header:200}")
    private int headerSize;

    @Value("${app.logo.sizes.favicon:64}")
    private int faviconSize;

    @Value("${app.logo.sizes.compact:32}")
    private int compactSize;

    public LogoUploadResponse uploadLogo(UUID companyId, MultipartFile file) {
        validateFile(file);

        try {
            ensureBucketExists();

            String originalFilename = file.getOriginalFilename();
            String extension = getExtension(originalFilename);
            String contentType = file.getContentType();
            String basePath = "companies/" + companyId + "/logos/";

            Map<String, String> resizedUrls = new HashMap<>();

            // Upload original
            String originalKey = basePath + "original" + extension;
            uploadToMinio(originalKey, file.getInputStream(), file.getSize(), contentType);
            String originalUrl = getObjectUrl(originalKey);

            // For SVGs, don't resize - just use original for all sizes
            if ("image/svg+xml".equals(contentType)) {
                resizedUrls.put("sidebar", originalUrl);
                resizedUrls.put("header", originalUrl);
                resizedUrls.put("favicon", originalUrl);
                resizedUrls.put("compact", originalUrl);
            } else {
                // Resize and upload different sizes
                BufferedImage originalImage = ImageIO.read(file.getInputStream());

                resizedUrls.put("sidebar", uploadResizedImage(basePath, "sidebar", extension, 
                        originalImage, sidebarSize, contentType));
                resizedUrls.put("header", uploadResizedImage(basePath, "header", extension, 
                        originalImage, headerSize, contentType));
                resizedUrls.put("favicon", uploadResizedImage(basePath, "favicon", extension, 
                        originalImage, faviconSize, contentType));
                resizedUrls.put("compact", uploadResizedImage(basePath, "compact", extension, 
                        originalImage, compactSize, contentType));
            }

            log.info("Uploaded logo for company {}: {}", companyId, originalKey);

            return LogoUploadResponse.builder()
                    .originalUrl(originalUrl)
                    .resizedUrls(resizedUrls)
                    .fileSizeBytes(file.getSize())
                    .mimeType(contentType)
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload logo for company {}", companyId, e);
            throw new InvalidRequestException("Failed to upload logo: " + e.getMessage());
        }
    }

    public void deleteLogo(UUID companyId) {
        String prefix = "companies/" + companyId + "/logos/";

        try {
            Iterable<Result<Item>> objects = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(prefix)
                            .build()
            );

            for (Result<Item> result : objects) {
                Item item = result.get();
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucketName)
                                .object(item.objectName())
                                .build()
                );
            }

            log.info("Deleted logo files for company {}", companyId);
        } catch (Exception e) {
            log.error("Failed to delete logo for company {}", companyId, e);
            throw new InvalidRequestException("Failed to delete logo: " + e.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidRequestException("File is empty");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new InvalidRequestException(
                    "File size exceeds maximum allowed size of " + (maxSizeBytes / 1024 / 1024) + "MB"
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !allowedMimeTypes.contains(contentType)) {
            throw new InvalidRequestException(
                    "Invalid file type. Allowed types: " + String.join(", ", allowedMimeTypes)
            );
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(bucketName).build()
        );

        if (!exists) {
            minioClient.makeBucket(
                    MakeBucketArgs.builder().bucket(bucketName).build()
            );
            log.info("Created bucket: {}", bucketName);
        }
    }

    private void uploadToMinio(String objectName, InputStream stream, long size, String contentType) 
            throws Exception {
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(stream, size, -1)
                        .contentType(contentType)
                        .build()
        );
    }

    private String uploadResizedImage(String basePath, String sizeName, String extension,
                                       BufferedImage original, int targetSize, String contentType) 
            throws Exception {
        
        BufferedImage resized = resizeImage(original, targetSize);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        String formatName = extension.replace(".", "");
        if ("jpg".equalsIgnoreCase(formatName)) {
            formatName = "jpeg";
        }
        
        ImageIO.write(resized, formatName, baos);
        byte[] bytes = baos.toByteArray();

        String objectName = basePath + sizeName + extension;
        uploadToMinio(objectName, new ByteArrayInputStream(bytes), bytes.length, contentType);

        return getObjectUrl(objectName);
    }

    private BufferedImage resizeImage(BufferedImage original, int targetSize) {
        int originalWidth = original.getWidth();
        int originalHeight = original.getHeight();

        int newWidth, newHeight;

        if (originalWidth > originalHeight) {
            newWidth = targetSize;
            newHeight = (int) ((double) originalHeight / originalWidth * targetSize);
        } else {
            newHeight = targetSize;
            newWidth = (int) ((double) originalWidth / originalHeight * targetSize);
        }

        BufferedImage resized = new BufferedImage(newWidth, newHeight, 
                original.getType() != 0 ? original.getType() : BufferedImage.TYPE_INT_ARGB);
        
        Graphics2D g2d = resized.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, 
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, 
                RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, 
                RenderingHints.VALUE_ANTIALIAS_ON);
        
        g2d.drawImage(original, 0, 0, newWidth, newHeight, null);
        g2d.dispose();

        return resized;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return ".png";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }

    private String getObjectUrl(String objectName) {
        // Return the relative path - actual URL construction depends on deployment
        return "/" + bucketName + "/" + objectName;
    }
}
