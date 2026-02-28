package com.erp.company.config;

import com.erp.company.dto.CompanyDto;
import com.erp.company.entity.UserCompanyAssignment;
import com.erp.company.repository.UserCompanyAssignmentRepository;
import com.erp.company.repository.CompanyRepository;
import com.erp.company.service.CompanyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializerConfig {

    @Value("${app.demo-company.auto-create:true}")
    private boolean autoCreateDemoCompany;

    // Super admin user ID from UserService seed data
    private static final UUID SUPER_ADMIN_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Bean
    public CommandLineRunner initializeData(CompanyService companyService,
                                            UserCompanyAssignmentRepository assignmentRepository,
                                            CompanyRepository companyRepository) {
        return args -> {
            if (autoCreateDemoCompany) {
                log.info("Initializing demo company...");
                CompanyDto demoCompany = companyService.createDemoCompanyIfNotExists();

                // Assign super admin to demo company if not already assigned
                UUID companyId = demoCompany.getId();
                if (!assignmentRepository.existsByUserIdAndCompanyId(SUPER_ADMIN_USER_ID, companyId)) {
                    var company = companyRepository.findById(companyId).orElse(null);
                    if (company != null) {
                        UserCompanyAssignment assignment = UserCompanyAssignment.builder()
                                .userId(SUPER_ADMIN_USER_ID)
                                .company(company)
                                .role(UserCompanyAssignment.UserRole.SUPER_ADMIN)
                                .build();
                        assignmentRepository.save(assignment);
                        log.info("Assigned super admin user to demo company: {} ({})", 
                                demoCompany.getName(), companyId);
                    }
                } else {
                    log.info("Super admin already assigned to demo company");
                }
            }
        };
    }
}
