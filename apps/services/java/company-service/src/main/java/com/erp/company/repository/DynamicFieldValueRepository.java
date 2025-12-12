package com.erp.company.repository;

import com.erp.company.entity.DynamicFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DynamicFieldValueRepository extends JpaRepository<DynamicFieldValue, UUID> {

    List<DynamicFieldValue> findByEntityId(UUID entityId);
    
    Optional<DynamicFieldValue> findByDefinitionIdAndEntityId(UUID definitionId, UUID entityId);
    
    @Query("SELECT v FROM DynamicFieldValue v " +
           "JOIN FETCH v.definition d " +
           "WHERE v.entityId = :entityId " +
           "ORDER BY d.displayOrder ASC")
    List<DynamicFieldValue> findByEntityIdWithDefinition(@Param("entityId") UUID entityId);
    
    @Modifying
    @Query("DELETE FROM DynamicFieldValue v WHERE v.definition.id IN " +
           "(SELECT d.id FROM DynamicFieldDefinition d WHERE d.company.id = :companyId)")
    void deleteAllByCompanyId(@Param("companyId") UUID companyId);
    
    void deleteAllByDefinitionId(UUID definitionId);
}
