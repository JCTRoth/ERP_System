package com.erp.company.mapper;

import com.erp.company.dto.DynamicFieldValueDto;
import com.erp.company.entity.DynamicFieldValue;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DynamicFieldValueMapper {
    
    @Mapping(target = "definitionId", source = "definition.id")
    @Mapping(target = "fieldName", source = "definition.fieldName")
    DynamicFieldValueDto toDto(DynamicFieldValue entity);
    
    List<DynamicFieldValueDto> toDtoList(List<DynamicFieldValue> entities);
}
