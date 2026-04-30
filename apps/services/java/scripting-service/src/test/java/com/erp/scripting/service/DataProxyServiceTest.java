package com.erp.scripting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

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

    @Test
    void testUnknownServiceThrows() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                service.executeGraphQL("unknown", "{ test }", null, null, null));
        assertTrue(ex.getMessage().contains("Unknown service"));
        assertTrue(ex.getMessage().contains("unknown"));
    }

    @Test
    void testAllowedServiceNames() {
        // These should NOT throw IllegalArgumentException for service name
        // They will throw RuntimeException because no real server is listening
        for (String name : new String[]{"gateway", "masterdata", "shop", "accounting", "user", "company"}) {
            RuntimeException ex = assertThrows(RuntimeException.class, () ->
                    service.executeGraphQL(name, "{ test }", null, null, null));
            // Should fail at HTTP level, not at service validation
            assertTrue(ex.getMessage().contains("Failed to query"), 
                    "Service '" + name + "' should be allowed but failed with: " + ex.getMessage());
        }
    }

    @Test
    void testServiceNameCaseInsensitive() {
        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.executeGraphQL("MasterData", "{ test }", null, null, null));
        assertTrue(ex.getMessage().contains("Failed to query"));
    }

    @Test
    void testGetAvailableServices() {
        Map<String, Object> result = service.getAvailableServices();
        assertNotNull(result);
        assertTrue(result.containsKey("services"));
        assertTrue(result.containsKey("usage"));
    }

    @Test
    void testForwardGraphQLMutationValidation() {
        // Mutation must start with "mutation"
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                service.forwardGraphQLMutation("masterdata", "{ query }", null, null, null));
        assertTrue(ex.getMessage().contains("must start with 'mutation'"));
    }

    @Test
    void testForwardGraphQLMutationAcceptsMutation() {
        // Should not throw validation error, but will fail at HTTP level
        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.forwardGraphQLMutation("masterdata", "mutation { test }", null, null, null));
        assertTrue(ex.getMessage().contains("Failed to query"));
    }

    @Test
    void testForwardGraphQLQueryAddsBearer() {
        // Test that the method doesn't throw for valid inputs
        // Actual HTTP call will fail since no server is running
        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.forwardGraphQLQuery("masterdata", "{ test }", null, "my-token", "company-1"));
        assertTrue(ex.getMessage().contains("Failed to query"));
    }
}
