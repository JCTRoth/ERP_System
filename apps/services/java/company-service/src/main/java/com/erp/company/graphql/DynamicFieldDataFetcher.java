package com.erp.company.graphql;

import com.erp.company.dto.CreateDynamicFieldRequest;
import com.erp.company.dto.DynamicFieldDefinitionDto;
import com.erp.company.dto.DynamicFieldValueDto;
import com.erp.company.dto.SetDynamicFieldValueRequest;
import com.erp.company.entity.DynamicFieldDefinition;
import com.erp.company.exception.AccessDeniedException;
import com.erp.company.service.DynamicFieldService;
import com.erp.company.service.RequestAuthorizationService;
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
    private final RequestAuthorizationService requestAuthorizationService;

    @DgsQuery
    public List<DynamicFieldDefinitionDto> dynamicFieldDefinitions(@InputArgument String companyId) {
        var targetCompanyId = UUID.fromString(companyId);
        requestAuthorizationService.requirePermission("masterdata.record.read");
        requestAuthorizationService.requireCompanyAccess(targetCompanyId);
        return dynamicFieldService.getFieldDefinitions(targetCompanyId);
    }

    @DgsQuery
    public List<DynamicFieldDefinitionDto> dynamicFieldDefinitionsByEntity(
            @InputArgument String companyId,
            @InputArgument String entityType) {
        var targetCompanyId = UUID.fromString(companyId);
        requestAuthorizationService.requirePermission("masterdata.record.read");
        requestAuthorizationService.requireCompanyAccess(targetCompanyId);
        return dynamicFieldService.getFieldDefinitionsForEntity(
                targetCompanyId,
                DynamicFieldDefinition.EntityType.valueOf(entityType)
        );
    }

    @DgsQuery
    public List<DynamicFieldValueDto> dynamicFieldValues(@InputArgument String entityId) {
        requestAuthorizationService.requirePermission("masterdata.record.read");
        var companyId = requestAuthorizationService.getCurrentCompanyId();
        if (companyId == null) {
            throw new AccessDeniedException("A company context is required to query dynamic field values");
        }
        requestAuthorizationService.requireCompanyAccess(companyId);
        return dynamicFieldService.getValuesForEntity(UUID.fromString(entityId), companyId);
    }

    @DgsMutation
    @SuppressWarnings("unchecked")
    public DynamicFieldDefinitionDto createDynamicFieldDefinition(
            @InputArgument Map<String, Object> input) {
        var companyId = UUID.fromString((String) input.get("companyId"));
        requestAuthorizationService.requirePermission("masterdata.record.manage");
        requestAuthorizationService.requireCompanyAccess(companyId);
        
        CreateDynamicFieldRequest request = CreateDynamicFieldRequest.builder()
                .companyId(companyId)
                .entityType(DynamicFieldDefinition.EntityType.valueOf((String) input.get("entityType")))
                .fieldName((String) input.get("fieldName"))
                .fieldType(DynamicFieldDefinition.FieldType.valueOf((String) input.get("fieldType")))
                .validationRules(input.get("validationRules") instanceof Map<?, ?> ? (Map<String, Object>) input.get("validationRules") : new java.util.HashMap<>())
                .displayOrder((Integer) input.get("displayOrder"))
                .build();
        
        return dynamicFieldService.createFieldDefinition(request);
    }

    @DgsMutation
    @SuppressWarnings("unchecked")
    public DynamicFieldDefinitionDto updateDynamicFieldDefinition(
            @InputArgument String id,
            @InputArgument Map<String, Object> input) {
        requestAuthorizationService.requirePermission("masterdata.record.manage");
        var definition = dynamicFieldService.getFieldDefinition(UUID.fromString(id));
        requestAuthorizationService.requireCompanyAccess(definition.getCompanyId());
        
        return dynamicFieldService.updateFieldDefinition(
                UUID.fromString(id),
                input.get("validationRules") instanceof Map<?, ?> ? (Map<String, Object>) input.get("validationRules") : new java.util.HashMap<>(),
                (Integer) input.get("displayOrder")
        );
    }

    @DgsMutation
    public Boolean deleteDynamicFieldDefinition(@InputArgument String id) {
        requestAuthorizationService.requirePermission("masterdata.record.manage");
        var definition = dynamicFieldService.getFieldDefinition(UUID.fromString(id));
        requestAuthorizationService.requireCompanyAccess(definition.getCompanyId());
        dynamicFieldService.deleteFieldDefinition(UUID.fromString(id));
        return true;
    }

    @DgsMutation
    public DynamicFieldValueDto setDynamicFieldValue(@InputArgument Map<String, Object> input) {
        requestAuthorizationService.requirePermission("masterdata.record.manage");
        var definition = dynamicFieldService.getFieldDefinition(UUID.fromString((String) input.get("definitionId")));
        requestAuthorizationService.requireCompanyAccess(definition.getCompanyId());
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
        requestAuthorizationService.requirePermission("masterdata.record.manage");
        var definition = dynamicFieldService.getFieldDefinition(UUID.fromString(definitionId));
        requestAuthorizationService.requireCompanyAccess(definition.getCompanyId());
        dynamicFieldService.deleteFieldValue(
                UUID.fromString(definitionId), 
                UUID.fromString(entityId)
        );
        return true;
    }
}
