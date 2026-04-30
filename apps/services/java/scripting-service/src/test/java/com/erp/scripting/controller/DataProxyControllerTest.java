package com.erp.scripting.controller;

import com.erp.scripting.service.DataProxyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for DataProxyController — validates HTTP request handling,
 * validation, and response mapping without starting the full application.
 */
@WebMvcTest(DataProxyController.class)
class DataProxyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataProxyService dataProxyService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void queryEndpointReturnsData() throws Exception {
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
    void queryEndpointRejectsMissingService() throws Exception {
        mockMvc.perform(post("/api/data/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "query", "{ test }"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void queryEndpointRejectsMissingQuery() throws Exception {
        mockMvc.perform(post("/api/data/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "service", "masterdata"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mutateEndpointRejectsNonMutationQuery() throws Exception {
        mockMvc.perform(post("/api/data/mutate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "service", "masterdata",
                                "query", "{ customers { nodes { id } } }"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mutateEndpointAcceptsMutation() throws Exception {
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
    void servicesEndpointReturnsList() throws Exception {
        when(dataProxyService.getAvailableServices())
                .thenReturn(Map.of(
                        "services", List.of(Map.of("name", "gateway", "description", "test")),
                        "usage", Map.of("query", "POST /api/data/query")
                ));

        mockMvc.perform(get("/api/data/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.services[0].name").value("gateway"));
    }

    @Test
    void queryEndpointHandsServiceError() throws Exception {
        when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                .thenThrow(new RuntimeException("Connection refused"));

        mockMvc.perform(post("/api/data/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "service", "masterdata",
                                "query", "{ test }"
                        ))))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void queryEndpointRejectsInvalidService() throws Exception {
        when(dataProxyService.executeGraphQL(anyString(), anyString(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Unknown service: 'evil'"));

        mockMvc.perform(post("/api/data/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "service", "evil",
                                "query", "{ test }"
                        ))))
                .andExpect(status().isBadRequest());
    }
}
