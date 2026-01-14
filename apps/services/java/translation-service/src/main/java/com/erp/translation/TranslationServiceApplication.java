package com.erp.translation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TranslationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TranslationServiceApplication.class, args);
    }
}
