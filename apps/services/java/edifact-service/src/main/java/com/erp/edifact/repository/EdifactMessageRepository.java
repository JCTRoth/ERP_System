package com.erp.edifact.repository;

import com.erp.edifact.entity.EdifactMessage;
import com.erp.edifact.entity.EdifactMessage.Direction;
import com.erp.edifact.entity.EdifactMessage.ProcessingStatus;
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
public interface EdifactMessageRepository extends JpaRepository<EdifactMessage, UUID> {
    
    Page<EdifactMessage> findByCompanyId(UUID companyId, Pageable pageable);
    
    Page<EdifactMessage> findByCompanyIdAndMessageType(UUID companyId, String messageType, Pageable pageable);
    
    Page<EdifactMessage> findByCompanyIdAndDirection(UUID companyId, Direction direction, Pageable pageable);
    
    List<EdifactMessage> findByStatus(ProcessingStatus status);
    
    @Query("SELECT m FROM EdifactMessage m WHERE m.companyId = :companyId " +
           "AND m.createdAt BETWEEN :startDate AND :endDate")
    List<EdifactMessage> findByCompanyIdAndDateRange(
            @Param("companyId") UUID companyId,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate
    );
    
    @Query("SELECT m.messageType, COUNT(m) FROM EdifactMessage m " +
           "WHERE m.companyId = :companyId GROUP BY m.messageType")
    List<Object[]> countByMessageType(@Param("companyId") UUID companyId);
    
    @Query("SELECT m.status, COUNT(m) FROM EdifactMessage m " +
           "WHERE m.companyId = :companyId GROUP BY m.status")
    List<Object[]> countByStatus(@Param("companyId") UUID companyId);
}
