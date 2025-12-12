package com.erp.scripting.repository;

import com.erp.scripting.entity.ScriptExecution;
import com.erp.scripting.entity.ScriptExecution.ExecutionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScriptExecutionRepository extends JpaRepository<ScriptExecution, UUID> {
    
    Page<ScriptExecution> findByScriptId(UUID scriptId, Pageable pageable);
    
    Page<ScriptExecution> findByCompanyId(UUID companyId, Pageable pageable);
    
    List<ScriptExecution> findByScriptIdAndStatus(UUID scriptId, ExecutionStatus status);
    
    @Query("SELECT AVG(e.executionTimeMs) FROM ScriptExecution e WHERE e.scriptId = :scriptId AND e.status = 'SUCCESS'")
    Double getAverageExecutionTime(@Param("scriptId") UUID scriptId);
    
    @Query("SELECT COUNT(e) FROM ScriptExecution e WHERE e.scriptId = :scriptId AND e.status = :status")
    long countByScriptIdAndStatus(@Param("scriptId") UUID scriptId, @Param("status") ExecutionStatus status);
    
    @Query("SELECT e FROM ScriptExecution e WHERE e.companyId = :companyId AND e.startedAt > :since ORDER BY e.startedAt DESC")
    List<ScriptExecution> findRecentByCompany(@Param("companyId") UUID companyId, @Param("since") OffsetDateTime since);
}
