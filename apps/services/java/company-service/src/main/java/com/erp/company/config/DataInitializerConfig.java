package com.erp.company.config;

import com.erp.company.service.CompanyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializerConfig {

    @Value("${app.demo-company.auto-create:true}")
    private boolean autoCreateDemoCompany;

    @Bean
    public CommandLineRunner initializeData(CompanyService companyService) {
        return args -> {
            if (autoCreateDemoCompany) {
                log.info("Initializing demo company...");
                companyService.createDemoCompanyIfNotExists();
            }
        };
    }
}
