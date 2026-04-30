package com.erp.scripting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DataProxyService — validates service routing, validation, and error handling.
 * Does NOT make real HTTP calls (no target services running in unit tests).
 */
class DataProxyServiceTest {

    private DataProxyService service;

    @BeforeEach
    void setUp() {
        service = new DataProxyService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "gatewayUrl", "http://gateway:4000");
        ReflectionTestUtils.setField(service, "masterdataUrl", "http://masterdata:5002");
        ReflectionTestUtils.setField(service, "shopUrl", "http://shop:5003");
        ReflectionTestUtils.setField(service, "accountingUrl", "http://accounting:5001");
        ReflectionTestUtils.setField(service, "userUrl", "http://user:5000");
        ReflectionTestUtils.setField(service, "companyUrl", "http://company:8080");
    }

    // ── Service name validation ──────────────────────────────────────────

    @Nested
    class ServiceNameValidation {

        @Test
        void unknownServiceThrowsIllegalArgument() {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    service.executeGraphQL("unknown", "{ test }", null, null, null));
            assertTrue(ex.getMessage().contains("Unknown service"));
            assertTrue(ex.getMessage().contains("unknown"));
        }

        @ParameterizedTest
        @ValueSource(strings = {"gateway", "masterdata", "shop", "accounting", "user", "company"})
        void allowedServiceNamesPassValidation(String name) {
            // Should fail at HTTP level, NOT at service-name validation
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL(name, "{ test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"),
                    "Service '" + name + "' should be allowed but failed with: " + ex.getMessage());
        }

        @ParameterizedTest
        @ValueSource(strings = {"MasterData", "SHOP", "  accounting  ", "Gateway"})
        void serviceNameIsCaseAndWhitespaceInsensitive(String name) {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL(name, "{ test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "  ", "evil-service", "scripting", "notification", "../../etc/passwd"})
        void disallowedServiceNamesThrow(String name) {
            assertThrows(Exception.class, () ->
                    service.executeGraphQL(name, "{ test }", null, null, null));
        }
    }

    // ── getAvailableServices ─────────────────────────────────────────────

    @Nested
    class AvailableServices {

        @Test
        void returnsServicesAndUsage() {
            Map<String, Object> result = service.getAvailableServices();
            assertNotNull(result);
            assertTrue(result.containsKey("services"));
            assertTrue(result.containsKey("usage"));
        }

        @SuppressWarnings("unchecked")
        @Test
        void listsAllSixServices() {
            Map<String, Object> result = service.getAvailableServices();
            List<Map<String, String>> services = (List<Map<String, String>>) result.get("services");
            assertEquals(6, services.size());
            List<String> names = services.stream().map(m -> m.get("name")).toList();
            assertTrue(names.containsAll(List.of("gateway", "masterdata", "shop", "accounting", "user", "company")));
        }

        @SuppressWarnings("unchecked")
        @Test
        void eachServiceHasDescription() {
            Map<String, Object> result = service.getAvailableServices();
            List<Map<String, String>> services = (List<Map<String, String>>) result.get("services");
            for (Map<String, String> svc : services) {
                assertNotNull(svc.get("description"), "Service " + svc.get("name") + " missing description");
                assertFalse(svc.get("description").isBlank());
            }
        }
    }

    // ── forwardGraphQLMutation ───────────────────────────────────────────

    @Nested
    class MutationForwarding {

        @Test
        void rejectsQueryThatIsNotMutation() {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    service.forwardGraphQLMutation("masterdata", "{ query }", null, null, null));
            assertTrue(ex.getMessage().contains("must start with 'mutation'"));
        }

        @Test
        void rejectsSubscription() {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    service.forwardGraphQLMutation("masterdata", "subscription { test }", null, null, null));
            assertTrue(ex.getMessage().contains("must start with 'mutation'"));
        }

        @Test
        void acceptsMutationKeyword() {
            // Passes validation, fails at HTTP level
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLMutation("masterdata", "mutation { test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void acceptsMutationWithLeadingWhitespace() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLMutation("masterdata", "  \n mutation { test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void acceptsMutationCaseInsensitive() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLMutation("masterdata", "MUTATION { test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }
    }

    // ── forwardGraphQLQuery (Bearer token handling) ──────────────────────

    @Nested
    class QueryForwarding {

        @Test
        void passesValidationWithToken() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLQuery("masterdata", "{ test }", null, "my-token", "company-1"));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void worksWithNullToken() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLQuery("masterdata", "{ test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void doesNotDoubleBearerPrefix() {
            // If token already has Bearer prefix, it should not be doubled
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLQuery("masterdata", "{ test }", null, "Bearer already", null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void worksWithVariables() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLQuery("masterdata",
                            "query GetCustomer($id: UUID!) { customer(id: $id) { id } }",
                            Map.of("id", "test-uuid"), "token", "company-1"));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void worksWithEmptyVariables() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.forwardGraphQLQuery("masterdata", "{ test }", Map.of(), null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }
    }

    // ── executeGraphQL edge cases ────────────────────────────────────────

    @Nested
    class ExecuteGraphQLEdgeCases {

        @Test
        void emptyAuthHeaderIsNotForwarded() {
            // Should not crash with empty/blank auth
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL("masterdata", "{ test }", null, "", ""));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void nullVariablesAreAccepted() {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL("masterdata", "{ test }", null, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }

        @Test
        void complexVariablesAreAccepted() {
            Map<String, Object> vars = Map.of(
                    "input", Map.of("name", "Test", "nested", Map.of("key", "value")),
                    "ids", List.of("a", "b", "c")
            );
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL("masterdata", "{ test }", vars, null, null));
            assertTrue(ex.getMessage().contains("Failed to query"));
        }
    }
}
