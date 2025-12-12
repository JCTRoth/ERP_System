package com.erp.scripting.repository;

import com.erp.scripting.entity.Script;
import com.erp.scripting.entity.Script.ScriptType;
import com.erp.scripting.entity.Script.TriggerEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScriptRepository extends JpaRepository<Script, UUID> {
    
    List<Script> findByCompanyId(UUID companyId);
    
    List<Script> findByCompanyIdAndIsActiveTrue(UUID companyId);
    
    List<Script> findByCompanyIdAndType(UUID companyId, ScriptType type);
    
    @Query("SELECT s FROM Script s WHERE s.companyId = :companyId AND s.triggerEvent = :event " +
           "AND s.triggerEntity = :entity AND s.isActive = true")
    List<Script> findActiveByTrigger(
            @Param("companyId") UUID companyId,
            @Param("event") TriggerEvent event,
            @Param("entity") String entity
    );
    
    @Query("SELECT s FROM Script s WHERE s.companyId = :companyId AND s.name LIKE %:search%")
    List<Script> searchByName(@Param("companyId") UUID companyId, @Param("search") String search);
    
    boolean existsByCompanyIdAndName(UUID companyId, String name);
}
