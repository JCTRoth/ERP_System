package com.erp.company.repository;

import com.erp.company.entity.DynamicFieldDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DynamicFieldDefinitionRepository extends JpaRepository<DynamicFieldDefinition, UUID> {

    List<DynamicFieldDefinition> findByCompanyIdOrderByDisplayOrderAsc(UUID companyId);
    
    List<DynamicFieldDefinition> findByCompanyIdAndEntityTypeOrderByDisplayOrderAsc(
            UUID companyId, 
            DynamicFieldDefinition.EntityType entityType
    );
    
    Optional<DynamicFieldDefinition> findByCompanyIdAndEntityTypeAndFieldName(
            UUID companyId,
            DynamicFieldDefinition.EntityType entityType,
            String fieldName
    );
    
    boolean existsByCompanyIdAndEntityTypeAndFieldName(
            UUID companyId,
            DynamicFieldDefinition.EntityType entityType,
            String fieldName
    );
    
    @Query("SELECT d FROM DynamicFieldDefinition d WHERE d.company.id = :companyId " +
           "AND d.entityType = :entityType ORDER BY d.displayOrder ASC")
    List<DynamicFieldDefinition> findFieldsForEntity(
            @Param("companyId") UUID companyId,
            @Param("entityType") DynamicFieldDefinition.EntityType entityType
    );
    
    void deleteAllByCompanyId(UUID companyId);
}
