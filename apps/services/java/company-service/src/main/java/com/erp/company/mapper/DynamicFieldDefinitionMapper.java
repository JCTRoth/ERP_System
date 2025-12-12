package com.erp.company.mapper;

import com.erp.company.dto.DynamicFieldDefinitionDto;
import com.erp.company.entity.DynamicFieldDefinition;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DynamicFieldDefinitionMapper {
    
    @Mapping(target = "companyId", source = "company.id")
    DynamicFieldDefinitionDto toDto(DynamicFieldDefinition entity);
    
    List<DynamicFieldDefinitionDto> toDtoList(List<DynamicFieldDefinition> entities);
}
