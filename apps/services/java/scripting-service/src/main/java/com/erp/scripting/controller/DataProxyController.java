package com.erp.scripting.controller;

import com.erp.scripting.service.DataProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller that proxies GraphQL queries/mutations to other ERP services.
 * Used by UI Builder scripts to read/write data through the existing service APIs.
 * 
 * All requests are forwarded with the original auth headers, so each target
 * service enforces its own access control (company filtering, permissions, etc.).
 */
@Slf4j
@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*", allowCredentials = "false")
public class DataProxyController {

    private final DataProxyService dataProxyService;

    /**
     * Proxy a GraphQL query to a target ERP service.
     * 
     * Request body:
     * {
     *   "service": "masterdata" | "shop" | "accounting" | "user" | "company" | "gateway",
     *   "query": "{ customers { nodes { id name email } } }",
     *   "variables": { ... }  // optional
     * }
     */
    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> proxyQuery(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Company-Id", required = false) String companyId
    ) {
        String service = (String) request.get("service");
        String query = (String) request.get("query");
        @SuppressWarnings("unchecked")
        Map<String, Object> variables = (Map<String, Object>) request.get("variables");

        if (service == null || service.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'service' field"));
        }
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'query' field"));
        }

        try {
            Map<String, Object> result = dataProxyService.executeGraphQL(
                    service, query, variables, authHeader, companyId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Data proxy query failed for service '{}': {}", service, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Query failed: " + e.getMessage()));
        }
    }

    /**
     * Proxy a GraphQL mutation to a target ERP service.
     * Same format as /query but validates that the query contains a mutation.
     */
    @PostMapping("/mutate")
    public ResponseEntity<Map<String, Object>> proxyMutation(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Company-Id", required = false) String companyId
    ) {
        String service = (String) request.get("service");
        String query = (String) request.get("query");
        @SuppressWarnings("unchecked")
        Map<String, Object> variables = (Map<String, Object>) request.get("variables");

        if (service == null || service.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'service' field"));
        }
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'query' field"));
        }

        // Basic validation: mutations must start with 'mutation'
        String trimmed = query.trim().toLowerCase();
        if (!trimmed.startsWith("mutation")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only mutation operations are allowed on /mutate endpoint"));
        }

        try {
            Map<String, Object> result = dataProxyService.executeGraphQL(
                    service, query, variables, authHeader, companyId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Data proxy mutation failed for service '{}': {}", service, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Mutation failed: " + e.getMessage()));
        }
    }

    /**
     * List available services and their capabilities.
     */
    @GetMapping("/services")
    public ResponseEntity<Map<String, Object>> listServices() {
        return ResponseEntity.ok(dataProxyService.getAvailableServices());
    }
}
