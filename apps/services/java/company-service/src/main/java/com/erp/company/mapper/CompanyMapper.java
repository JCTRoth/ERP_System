package com.erp.company.mapper;

import com.erp.company.dto.CompanyDto;
import com.erp.company.entity.Company;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(componentModel = "spring", 
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CompanyMapper {
    
    CompanyDto toDto(Company entity);
    
    Company toEntity(CompanyDto dto);
    
    List<CompanyDto> toDtoList(List<Company> entities);
    
    void updateEntity(@MappingTarget Company entity, CompanyDto dto);
}
