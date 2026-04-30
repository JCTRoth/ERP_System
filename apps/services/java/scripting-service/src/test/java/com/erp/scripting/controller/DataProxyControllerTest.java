package com.erp.scripting.controller;

import com.erp.scripting.service.DataProxyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for DataProxyController — validates HTTP request handling,
 * validation, header forwarding, and response mapping.
 */
@WebMvcTest(DataProxyController.class)
class DataProxyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataProxyService dataProxyService;

    @Autowired
    private ObjectMapper objectMapper;

    // ── /api/data/query ──────────────────────────────────────────────────

    @Nested
    class QueryEndpoint {

        @Test
        void returnsDataFromService() throws Exception {
            Map<String, Object> graphqlResult = Map.of(
                    "data", Map.of("customers", Map.of("nodes", List.of(
                            Map.of("id", "1", "name", "Test Customer")
                    )))
            );
            when(dataProxyService.executeGraphQL(eq("masterdata"), anyString(), any(), any(), any()))
                    .thenReturn(graphqlResult);

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", "Bearer test-token")
                            .header("X-Company-Id", "company-1")
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ customers { nodes { id name } } }"
                            ))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.customers.nodes[0].name").value("Test Customer"));
        }

        @Test
        void forwardsAuthorizationHeader() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", "Bearer my-secret-token")
                            .header("X-Company-Id", "comp-123")
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isOk());

            ArgumentCaptor<String> authCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> companyCaptor = ArgumentCaptor.forClass(String.class);
            verify(dataProxyService).executeGraphQL(
                    eq("masterdata"), eq("{ test }"), isNull(),
                    authCaptor.capture(), companyCaptor.capture());
            assertEquals("Bearer my-secret-token", authCaptor.getValue());
            assertEquals("comp-123", companyCaptor.getValue());
        }

        @Test
        void worksWithoutAuthHeaders() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isOk());

            verify(dataProxyService).executeGraphQL(
                    eq("masterdata"), eq("{ test }"), isNull(), isNull(), isNull());
        }

        @Test
        void forwardsVariablesToService() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            Map<String, Object> request = new HashMap<>();
            request.put("service", "masterdata");
            request.put("query", "query($id: UUID!) { customer(id: $id) { name } }");
            request.put("variables", Map.of("id", "abc-123"));

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            @SuppressWarnings("unchecked")
            ArgumentCaptor<Map<String, Object>> varsCaptor = ArgumentCaptor.forClass(Map.class);
            verify(dataProxyService).executeGraphQL(
                    eq("masterdata"), anyString(), varsCaptor.capture(), any(), any());
            assertEquals("abc-123", varsCaptor.getValue().get("id"));
        }

        @Test
        void rejectsMissingService() throws Exception {
            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'service' field"));
        }

        @Test
        void rejectsBlankService() throws Exception {
            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "   ",
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'service' field"));
        }

        @Test
        void rejectsMissingQuery() throws Exception {
            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'query' field"));
        }

        @Test
        void rejectsBlankQuery() throws Exception {
            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", ""
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'query' field"));
        }

        @Test
        void returnsInvalidServiceAsBadRequest() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenThrow(new IllegalArgumentException("Unknown service: 'evil'"));

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "evil",
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Unknown service: 'evil'"));
        }

        @Test
        void returnsServiceErrorAsInternalServerError() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenThrow(new RuntimeException("Connection refused"));

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ test }"
                            ))))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").exists());
        }

        @Test
        void handlesGraphQLErrorsInResponse() throws Exception {
            // GraphQL can return 200 with errors in the body — proxy should forward as-is
            Map<String, Object> graphqlResult = new HashMap<>();
            graphqlResult.put("data", null);
            graphqlResult.put("errors", List.of(Map.of("message", "Field not found")));
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(graphqlResult);

            mockMvc.perform(post("/api/data/query")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ nonexistent }"
                            ))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.errors[0].message").value("Field not found"));
        }
    }

    // ── /api/data/mutate ─────────────────────────────────────────────────

    @Nested
    class MutateEndpoint {

        @Test
        void acceptsValidMutation() throws Exception {
            Map<String, Object> graphqlResult = Map.of(
                    "data", Map.of("createCustomer", Map.of("id", "new-id"))
            );
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(graphqlResult);

            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", "Bearer test-token")
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "mutation { createCustomer(input: {}) { id } }"
                            ))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.createCustomer.id").value("new-id"));
        }

        @Test
        void acceptsMutationWithLeadingWhitespace() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "  \n  mutation { test }"
                            ))))
                    .andExpect(status().isOk());
        }

        @Test
        void acceptsMutationCaseInsensitive() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "MUTATION { test }"
                            ))))
                    .andExpect(status().isOk());
        }

        @Test
        void rejectsQueryOnMutateEndpoint() throws Exception {
            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "{ customers { nodes { id } } }"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Only mutation operations are allowed on /mutate endpoint"));
        }

        @Test
        void rejectsSubscriptionOnMutateEndpoint() throws Exception {
            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "subscription { onOrderCreated { id } }"
                            ))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void rejectsMissingServiceOnMutate() throws Exception {
            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "query", "mutation { test }"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'service' field"));
        }

        @Test
        void rejectsMissingQueryOnMutate() throws Exception {
            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata"
                            ))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Missing 'query' field"));
        }

        @Test
        void forwardsAuthOnMutate() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenReturn(Map.of("data", Map.of()));

            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", "Bearer mutate-token")
                            .header("X-Company-Id", "comp-456")
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "shop",
                                    "query", "mutation { test }"
                            ))))
                    .andExpect(status().isOk());

            verify(dataProxyService).executeGraphQL(
                    eq("shop"), eq("mutation { test }"), isNull(),
                    eq("Bearer mutate-token"), eq("comp-456"));
        }

        @Test
        void returnsServiceErrorOnMutate() throws Exception {
            when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                    .thenThrow(new RuntimeException("Target service unavailable"));

            mockMvc.perform(post("/api/data/mutate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "service", "masterdata",
                                    "query", "mutation { test }"
                            ))))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").exists());
        }
    }

    // ── /api/data/services ───────────────────────────────────────────────

    @Nested
    class ServicesEndpoint {

        @Test
        void returnsList() throws Exception {
            when(dataProxyService.getAvailableServices())
                    .thenReturn(Map.of(
                            "services", List.of(
                                    Map.of("name", "gateway", "description", "Apollo Gateway"),
                                    Map.of("name", "masterdata", "description", "Master data")
                            ),
                            "usage", Map.of("query", "POST /api/data/query")
                    ));

            mockMvc.perform(get("/api/data/services"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.services[0].name").value("gateway"))
                    .andExpect(jsonPath("$.services[1].name").value("masterdata"))
                    .andExpect(jsonPath("$.usage.query").value("POST /api/data/query"));
        }

        @Test
        void requiresNoAuth() throws Exception {
            when(dataProxyService.getAvailableServices())
                    .thenReturn(Map.of("services", List.of(), "usage", Map.of()));

            // No auth headers — should still work
            mockMvc.perform(get("/api/data/services"))
                    .andExpect(status().isOk());
        }
    }
}
