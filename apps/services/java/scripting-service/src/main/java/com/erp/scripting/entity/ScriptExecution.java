package com.erp.scripting.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "script_executions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScriptExecution {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "script_id", nullable = false)
    private UUID scriptId;
    
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    
    @Column(name = "executed_by")
    private UUID executedBy;
    
    @Column(name = "input_data", columnDefinition = "jsonb")
    private String inputData;
    
    @Column(name = "output_data", columnDefinition = "jsonb")
    private String outputData;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status;
    
    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;
    
    @Column(name = "execution_time_ms")
    private Long executionTimeMs;
    
    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;
    
    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
    
    @PrePersist
    protected void onCreate() {
        startedAt = OffsetDateTime.now();
        if (status == null) {
            status = ExecutionStatus.RUNNING;
        }
    }
    
    public enum ExecutionStatus {
        RUNNING,
        SUCCESS,
        FAILED,
        TIMEOUT,
        CANCELLED
    }
}
