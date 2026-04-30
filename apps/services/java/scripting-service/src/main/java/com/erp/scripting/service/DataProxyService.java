package com.erp.scripting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Service that proxies GraphQL requests to other ERP microservices.
 * Forwards the caller's auth headers so each target service enforces its own access control.
 */
@Slf4j
@Service
public class DataProxyService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Service URLs (configurable via environment variables)
    @Value("${erp.services.gateway:http://gateway:4000}")
    private String gatewayUrl;

    @Value("${erp.services.masterdata:http://masterdata-service:5002}")
    private String masterdataUrl;

    @Value("${erp.services.shop:http://shop-service:5003}")
    private String shopUrl;

    @Value("${erp.services.accounting:http://accounting-service:5001}")
    private String accountingUrl;

    @Value("${erp.services.user:http://user-service:5000}")
    private String userUrl;

    @Value("${erp.services.company:http://company-service:8080}")
    private String companyUrl;

    private static final Set<String> ALLOWED_SERVICES = Set.of(
            "gateway", "masterdata", "shop", "accounting", "user", "company"
    );

    public DataProxyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Execute a GraphQL query/mutation against a target service.
     * Auth headers are forwarded to let the target service enforce access control.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> executeGraphQL(
            String service, String query, Map<String, Object> variables,
            String authHeader, String companyId) {

        String serviceKey = service.toLowerCase().trim();
        if (!ALLOWED_SERVICES.contains(serviceKey)) {
            throw new IllegalArgumentException(
                    "Unknown service: '" + service + "'. Available: " + ALLOWED_SERVICES);
        }

        String url = getServiceUrl(serviceKey) + "/graphql";

        // Build GraphQL request body
        Map<String, Object> body = new HashMap<>();
        body.put("query", query);
        if (variables != null && !variables.isEmpty()) {
            body.put("variables", variables);
        }

        // Build headers — forward auth
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set("Authorization", authHeader);
        }
        if (companyId != null && !companyId.isBlank()) {
            headers.set("X-Company-Id", companyId);
        }

        log.debug("Proxying GraphQL to {} ({}): {}", serviceKey, url,
                query.length() > 100 ? query.substring(0, 100) + "..." : query);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, String.class);

            if (response.getBody() != null) {
                return objectMapper.readValue(response.getBody(), Map.class);
            }
            return Map.of("data", null);
        } catch (Exception e) {
            log.error("GraphQL proxy request to {} failed: {}", serviceKey, e.getMessage());
            throw new RuntimeException("Failed to query " + serviceKey + ": " + e.getMessage(), e);
        }
    }

    private String getServiceUrl(String service) {
        return switch (service) {
            case "gateway" -> gatewayUrl;
            case "masterdata" -> masterdataUrl;
            case "shop" -> shopUrl;
            case "accounting" -> accountingUrl;
            case "user" -> userUrl;
            case "company" -> companyUrl;
            default -> throw new IllegalArgumentException("Unknown service: " + service);
        };
    }

    /**
     * Return metadata about available services for documentation/discovery.
     */
    public Map<String, Object> getAvailableServices() {
        List<Map<String, String>> services = List.of(
                Map.of("name", "gateway", "description", "Apollo Gateway — federated queries across all services"),
                Map.of("name", "masterdata", "description", "Customers, suppliers, employees, currencies, payment terms, units of measure"),
                Map.of("name", "shop", "description", "Products, categories, orders, inventory"),
                Map.of("name", "accounting", "description", "Invoices, payments, journal entries, accounts, reports"),
                Map.of("name", "user", "description", "Users, authentication, roles, permissions"),
                Map.of("name", "company", "description", "Companies, organizational structure, settings")
        );

        return Map.of(
                "services", services,
                "usage", Map.of(
                        "query", "POST /api/data/query with { service, query, variables }",
                        "mutate", "POST /api/data/mutate with { service, query, variables }"
                )
        );
    }

    /**
     * Forward a GraphQL query — for internal use by GraalJSEngine.
     * Accepts raw token (without "Bearer " prefix) and companyId.
     */
    public Map<String, Object> forwardGraphQLQuery(
            String service, String query, Map<String, Object> variables,
            String authToken, String companyId) {
        String authHeader = authToken != null && !authToken.isBlank()
                ? (authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken)
                : null;
        return executeGraphQL(service, query, variables, authHeader, companyId);
    }

    /**
     * Forward a GraphQL mutation — for internal use by GraalJSEngine.
     * Validates that the query is actually a mutation.
     */
    public Map<String, Object> forwardGraphQLMutation(
            String service, String mutation, Map<String, Object> variables,
            String authToken, String companyId) {
        if (mutation != null && !mutation.trim().toLowerCase().startsWith("mutation")) {
            throw new IllegalArgumentException("Query must start with 'mutation'");
        }
        String authHeader = authToken != null && !authToken.isBlank()
                ? (authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken)
                : null;
        return executeGraphQL(service, mutation, variables, authHeader, companyId);
    }
}
