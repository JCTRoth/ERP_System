package com.erp.company.mapper;

import com.erp.company.dto.UserCompanyAssignmentDto;
import com.erp.company.entity.UserCompanyAssignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserCompanyAssignmentMapper {
    
    @Mapping(target = "companyId", source = "company.id")
    @Mapping(target = "companyName", source = "company.name")
    UserCompanyAssignmentDto toDto(UserCompanyAssignment entity);
    
    List<UserCompanyAssignmentDto> toDtoList(List<UserCompanyAssignment> entities);
}
