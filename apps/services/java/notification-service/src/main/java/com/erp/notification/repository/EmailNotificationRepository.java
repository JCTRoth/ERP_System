package com.erp.notification.repository;

import com.erp.notification.entity.EmailNotification;
import com.erp.notification.entity.EmailNotification.NotificationStatus;
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
public interface EmailNotificationRepository extends JpaRepository<EmailNotification, UUID> {
    
    Page<EmailNotification> findByCompanyId(UUID companyId, Pageable pageable);
    
    Page<EmailNotification> findByUserId(UUID userId, Pageable pageable);
    
    List<EmailNotification> findByStatus(NotificationStatus status);
    
    @Query("SELECT e FROM EmailNotification e WHERE e.status = :status AND e.retryCount < :maxRetries")
    List<EmailNotification> findPendingWithRetryLimit(
            @Param("status") NotificationStatus status,
            @Param("maxRetries") int maxRetries
    );
    
    @Query("SELECT e FROM EmailNotification e WHERE e.status = 'FAILED' AND e.createdAt > :since")
    List<EmailNotification> findFailedSince(@Param("since") OffsetDateTime since);
    
    @Query("SELECT COUNT(e) FROM EmailNotification e WHERE e.status = :status")
    long countByStatus(@Param("status") NotificationStatus status);
    
    @Query("SELECT COUNT(e) FROM EmailNotification e WHERE e.companyId = :companyId AND e.sentAt > :since")
    long countSentByCompanySince(@Param("companyId") UUID companyId, @Param("since") OffsetDateTime since);
}
