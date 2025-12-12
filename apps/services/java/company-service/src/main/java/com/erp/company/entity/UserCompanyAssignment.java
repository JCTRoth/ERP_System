package com.erp.company.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_company_assignments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "company_id"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCompanyAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @CreatedDate
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;

    public enum UserRole {
        SUPER_ADMIN,
        ADMIN,
        USER,
        VIEWER
    }
}
