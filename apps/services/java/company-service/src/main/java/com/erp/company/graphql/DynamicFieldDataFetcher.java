package com.erp.company.graphql;

import com.erp.company.dto.CreateDynamicFieldRequest;
import com.erp.company.dto.DynamicFieldDefinitionDto;
import com.erp.company.dto.DynamicFieldValueDto;
import com.erp.company.dto.SetDynamicFieldValueRequest;
import com.erp.company.entity.DynamicFieldDefinition;
import com.erp.company.service.DynamicFieldService;
import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class DynamicFieldDataFetcher {

    private final DynamicFieldService dynamicFieldService;

    @DgsQuery
    public List<DynamicFieldDefinitionDto> dynamicFieldDefinitions(@InputArgument String companyId) {
        return dynamicFieldService.getFieldDefinitions(UUID.fromString(companyId));
    }

    @DgsQuery
    public List<DynamicFieldDefinitionDto> dynamicFieldDefinitionsByEntity(
            @InputArgument String companyId,
            @InputArgument String entityType) {
        return dynamicFieldService.getFieldDefinitionsForEntity(
                UUID.fromString(companyId),
                DynamicFieldDefinition.EntityType.valueOf(entityType)
        );
    }

    @DgsQuery
    public List<DynamicFieldValueDto> dynamicFieldValues(@InputArgument String entityId) {
        return dynamicFieldService.getValuesForEntity(UUID.fromString(entityId));
    }

    @DgsMutation
    public DynamicFieldDefinitionDto createDynamicFieldDefinition(
            @InputArgument Map<String, Object> input) {
        
        CreateDynamicFieldRequest request = CreateDynamicFieldRequest.builder()
                .companyId(UUID.fromString((String) input.get("companyId")))
                .entityType(DynamicFieldDefinition.EntityType.valueOf((String) input.get("entityType")))
                .fieldName((String) input.get("fieldName"))
                .fieldType(DynamicFieldDefinition.FieldType.valueOf((String) input.get("fieldType")))
                .validationRules(input.get("validationRules") instanceof Map<?, ?> ? (Map<String, Object>) input.get("validationRules") : new java.util.HashMap<>())
                .displayOrder((Integer) input.get("displayOrder"))
                .build();
        
        return dynamicFieldService.createFieldDefinition(request);
    }

    @DgsMutation
    public DynamicFieldDefinitionDto updateDynamicFieldDefinition(
            @InputArgument String id,
            @InputArgument Map<String, Object> input) {
        
        return dynamicFieldService.updateFieldDefinition(
                UUID.fromString(id),
                input.get("validationRules") instanceof Map<?, ?> ? (Map<String, Object>) input.get("validationRules") : new java.util.HashMap<>(),
                (Integer) input.get("displayOrder")
        );
    }

    @DgsMutation
    public Boolean deleteDynamicFieldDefinition(@InputArgument String id) {
        dynamicFieldService.deleteFieldDefinition(UUID.fromString(id));
        return true;
    }

    @DgsMutation
    public DynamicFieldValueDto setDynamicFieldValue(@InputArgument Map<String, Object> input) {
        SetDynamicFieldValueRequest request = SetDynamicFieldValueRequest.builder()
                .definitionId(UUID.fromString((String) input.get("definitionId")))
                .entityId(UUID.fromString((String) input.get("entityId")))
                .valueJson(input.get("valueJson"))
                .build();
        
        return dynamicFieldService.setFieldValue(request);
    }

    @DgsMutation
    public Boolean deleteDynamicFieldValue(@InputArgument String definitionId, 
                                            @InputArgument String entityId) {
        dynamicFieldService.deleteFieldValue(
                UUID.fromString(definitionId), 
                UUID.fromString(entityId)
        );
        return true;
    }
}
