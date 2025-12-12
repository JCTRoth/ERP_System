package com.erp.company.service;

import com.erp.company.dto.CreateDynamicFieldRequest;
import com.erp.company.dto.DynamicFieldDefinitionDto;
import com.erp.company.dto.DynamicFieldValueDto;
import com.erp.company.dto.SetDynamicFieldValueRequest;
import com.erp.company.entity.Company;
import com.erp.company.entity.DynamicFieldDefinition;
import com.erp.company.entity.DynamicFieldValue;
import com.erp.company.exception.DuplicateResourceException;
import com.erp.company.exception.ResourceNotFoundException;
import com.erp.company.mapper.DynamicFieldDefinitionMapper;
import com.erp.company.mapper.DynamicFieldValueMapper;
import com.erp.company.repository.CompanyRepository;
import com.erp.company.repository.DynamicFieldDefinitionRepository;
import com.erp.company.repository.DynamicFieldValueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicFieldService {

    private final DynamicFieldDefinitionRepository definitionRepository;
    private final DynamicFieldValueRepository valueRepository;
    private final CompanyRepository companyRepository;
    private final DynamicFieldDefinitionMapper definitionMapper;
    private final DynamicFieldValueMapper valueMapper;

    // ==================== Field Definitions ====================

    @Transactional(readOnly = true)
    public List<DynamicFieldDefinitionDto> getFieldDefinitions(UUID companyId) {
        return definitionMapper.toDtoList(
                definitionRepository.findByCompanyIdOrderByDisplayOrderAsc(companyId)
        );
    }

    @Transactional(readOnly = true)
    public List<DynamicFieldDefinitionDto> getFieldDefinitionsForEntity(
            UUID companyId, 
            DynamicFieldDefinition.EntityType entityType) {
        return definitionMapper.toDtoList(
                definitionRepository.findFieldsForEntity(companyId, entityType)
        );
    }

    @Transactional(readOnly = true)
    public DynamicFieldDefinitionDto getFieldDefinition(UUID definitionId) {
        DynamicFieldDefinition definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicFieldDefinition", "id", definitionId));
        return definitionMapper.toDto(definition);
    }

    @Transactional
    public DynamicFieldDefinitionDto createFieldDefinition(CreateDynamicFieldRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));

        if (definitionRepository.existsByCompanyIdAndEntityTypeAndFieldName(
                request.getCompanyId(), request.getEntityType(), request.getFieldName())) {
            throw new DuplicateResourceException(
                    "Field definition already exists with name: " + request.getFieldName()
            );
        }

        DynamicFieldDefinition definition = DynamicFieldDefinition.builder()
                .company(company)
                .entityType(request.getEntityType())
                .fieldName(request.getFieldName())
                .fieldType(request.getFieldType())
                .validationRules(request.getValidationRules())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        DynamicFieldDefinition saved = definitionRepository.save(definition);
        log.info("Created dynamic field definition: {} for {} in company {}", 
                saved.getFieldName(), saved.getEntityType(), company.getName());
        
        return definitionMapper.toDto(saved);
    }

    @Transactional
    public DynamicFieldDefinitionDto updateFieldDefinition(
            UUID definitionId, 
            Map<String, Object> validationRules,
            Integer displayOrder) {
        
        DynamicFieldDefinition definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicFieldDefinition", "id", definitionId));

        if (validationRules != null) {
            definition.setValidationRules(validationRules);
        }
        if (displayOrder != null) {
            definition.setDisplayOrder(displayOrder);
        }

        DynamicFieldDefinition saved = definitionRepository.save(definition);
        log.info("Updated dynamic field definition: {}", saved.getFieldName());
        
        return definitionMapper.toDto(saved);
    }

    @Transactional
    public void deleteFieldDefinition(UUID definitionId) {
        DynamicFieldDefinition definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicFieldDefinition", "id", definitionId));

        // Delete all values first
        valueRepository.deleteAllByDefinitionId(definitionId);
        definitionRepository.delete(definition);
        
        log.info("Deleted dynamic field definition: {}", definition.getFieldName());
    }

    // ==================== Field Values ====================

    @Transactional(readOnly = true)
    public List<DynamicFieldValueDto> getValuesForEntity(UUID entityId) {
        return valueMapper.toDtoList(
                valueRepository.findByEntityIdWithDefinition(entityId)
        );
    }

    @Transactional(readOnly = true)
    public DynamicFieldValueDto getValue(UUID definitionId, UUID entityId) {
        DynamicFieldValue value = valueRepository.findByDefinitionIdAndEntityId(definitionId, entityId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Value not found for definition " + definitionId + " and entity " + entityId
                ));
        return valueMapper.toDto(value);
    }

    @Transactional
    public DynamicFieldValueDto setFieldValue(SetDynamicFieldValueRequest request) {
        DynamicFieldDefinition definition = definitionRepository.findById(request.getDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "DynamicFieldDefinition", "id", request.getDefinitionId()
                ));

        DynamicFieldValue value = valueRepository
                .findByDefinitionIdAndEntityId(request.getDefinitionId(), request.getEntityId())
                .orElseGet(() -> DynamicFieldValue.builder()
                        .definition(definition)
                        .entityId(request.getEntityId())
                        .build());

        value.setValueJson(request.getValueJson());
        DynamicFieldValue saved = valueRepository.save(value);
        
        log.debug("Set value for field {} on entity {}", 
                definition.getFieldName(), request.getEntityId());
        
        return valueMapper.toDto(saved);
    }

    @Transactional
    public void deleteFieldValue(UUID definitionId, UUID entityId) {
        DynamicFieldValue value = valueRepository.findByDefinitionIdAndEntityId(definitionId, entityId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Value not found for definition " + definitionId + " and entity " + entityId
                ));
        
        valueRepository.delete(value);
        log.debug("Deleted value for definition {} on entity {}", definitionId, entityId);
    }
}
