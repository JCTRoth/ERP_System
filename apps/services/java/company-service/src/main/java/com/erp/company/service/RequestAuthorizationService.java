package com.erp.company.service;

import com.erp.company.exception.AccessDeniedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RequestAuthorizationService {

    private final HttpServletRequest request;
    private final String internalApiKey;

    public RequestAuthorizationService(
            HttpServletRequest request,
            @Value("${app.auth.internal-api-key:erp-internal-auth-key}") String internalApiKey) {
        this.request = request;
        this.internalApiKey = internalApiKey;
    }

    public UUID getCurrentUserId() {
        String raw = request.getHeader("X-User-Id");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public UUID getCurrentCompanyId() {
        String raw = request.getHeader("X-Company-Id");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public boolean isGlobalSuperAdmin() {
        return Boolean.parseBoolean(request.getHeader("X-Is-Global-Super-Admin"));
    }

    public boolean isInternalRequest() {
        String providedKey = request.getHeader("X-Internal-Api-Key");
        return providedKey != null && providedKey.equals(internalApiKey);
    }

    public boolean isInternalGlobalSuperAdmin() {
        return Boolean.parseBoolean(request.getHeader("X-Internal-Is-Global-Super-Admin"));
    }

    public Set<String> getPermissionCodes() {
        String raw = request.getHeader("X-Permission-Codes");
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }

        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
    }

    public boolean hasPermission(String permissionCode) {
        return isGlobalSuperAdmin() || getPermissionCodes().contains(permissionCode);
    }

    public void requirePermission(String permissionCode) {
        if (!hasPermission(permissionCode)) {
            throw new AccessDeniedException("Missing required permission: " + permissionCode);
        }
    }

    public void requireCompanyAccess(UUID companyId) {
        if (isGlobalSuperAdmin()) {
            return;
        }

        UUID currentCompanyId = getCurrentCompanyId();
        if (currentCompanyId == null || !currentCompanyId.equals(companyId)) {
            throw new AccessDeniedException("Access denied for company " + companyId);
        }
    }

    public void requireSelfOrPermission(UUID targetUserId, String permissionCode) {
        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(targetUserId)) {
            return;
        }

        requirePermission(permissionCode);
    }

    public void requireInternalAccess() {
        if (!isInternalRequest()) {
            throw new AccessDeniedException("Internal authorization access only");
        }
    }
}
