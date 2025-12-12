package com.erp.company.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic userCompanyAssignmentsTopic() {
        return TopicBuilder.name("user-company-assignments")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic companyEventsTopic() {
        return TopicBuilder.name("company-events")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
