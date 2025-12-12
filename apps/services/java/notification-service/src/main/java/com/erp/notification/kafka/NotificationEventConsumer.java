package com.erp.notification.kafka;

import com.erp.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventConsumer {
    
    private final EmailService emailService;
    
    @KafkaListener(topics = "user-events", groupId = "notification-service")
    public void handleUserEvent(Map<String, Object> event) {
        String eventType = (String) event.get("type");
        log.info("Received user event: {}", eventType);
        
        switch (eventType) {
            case "USER_CREATED" -> handleUserCreated(event);
            case "PASSWORD_RESET_REQUESTED" -> handlePasswordResetRequested(event);
            case "USER_INVITED" -> handleUserInvited(event);
            default -> log.debug("Ignoring user event type: {}", eventType);
        }
    }
    
    @KafkaListener(topics = "company-events", groupId = "notification-service")
    public void handleCompanyEvent(Map<String, Object> event) {
        String eventType = (String) event.get("type");
        log.info("Received company event: {}", eventType);
        
        switch (eventType) {
            case "USER_ASSIGNED_TO_COMPANY" -> handleUserAssignedToCompany(event);
            case "USER_REMOVED_FROM_COMPANY" -> handleUserRemovedFromCompany(event);
            default -> log.debug("Ignoring company event type: {}", eventType);
        }
    }
    
    @KafkaListener(topics = "order-events", groupId = "notification-service")
    public void handleOrderEvent(Map<String, Object> event) {
        String eventType = (String) event.get("type");
        log.info("Received order event: {}", eventType);
        
        switch (eventType) {
            case "ORDER_CREATED" -> handleOrderCreated(event);
            case "ORDER_SHIPPED" -> handleOrderShipped(event);
            case "ORDER_DELIVERED" -> handleOrderDelivered(event);
            default -> log.debug("Ignoring order event type: {}", eventType);
        }
    }
    
    private void handleUserCreated(Map<String, Object> event) {
        String email = (String) event.get("email");
        String firstName = (String) event.get("firstName");
        String lastName = (String) event.get("lastName");
        String language = (String) event.get("preferredLanguage");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                null,
                parseUUID(event.get("userId")),
                email,
                firstName + " " + lastName,
                null, // Will be set by template
                "welcome",
                Map.of(
                        "firstName", firstName,
                        "lastName", lastName,
                        "email", email
                ),
                null,
                null,
                language
        ));
    }
    
    private void handlePasswordResetRequested(Map<String, Object> event) {
        String email = (String) event.get("email");
        String resetToken = (String) event.get("resetToken");
        String language = (String) event.get("preferredLanguage");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                null,
                parseUUID(event.get("userId")),
                email,
                null,
                null,
                "password-reset",
                Map.of(
                        "resetToken", resetToken,
                        "resetUrl", "https://erp-system.local/reset-password?token=" + resetToken
                ),
                null,
                null,
                language
        ));
    }
    
    private void handleUserInvited(Map<String, Object> event) {
        String email = (String) event.get("email");
        String inviteToken = (String) event.get("inviteToken");
        String companyName = (String) event.get("companyName");
        String inviterName = (String) event.get("inviterName");
        String language = (String) event.get("language");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                parseUUID(event.get("companyId")),
                null,
                email,
                null,
                null,
                "user-invitation",
                Map.of(
                        "companyName", companyName,
                        "inviterName", inviterName,
                        "inviteUrl", "https://erp-system.local/accept-invite?token=" + inviteToken
                ),
                null,
                null,
                language
        ));
    }
    
    private void handleUserAssignedToCompany(Map<String, Object> event) {
        String email = (String) event.get("userEmail");
        String companyName = (String) event.get("companyName");
        String role = (String) event.get("role");
        String language = (String) event.get("language");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                parseUUID(event.get("companyId")),
                parseUUID(event.get("userId")),
                email,
                null,
                null,
                "company-assignment",
                Map.of(
                        "companyName", companyName,
                        "role", role
                ),
                null,
                null,
                language
        ));
    }
    
    private void handleUserRemovedFromCompany(Map<String, Object> event) {
        log.info("User removed from company - notification could be sent if needed");
    }
    
    private void handleOrderCreated(Map<String, Object> event) {
        String email = (String) event.get("customerEmail");
        String orderId = (String) event.get("orderId");
        String language = (String) event.get("language");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                parseUUID(event.get("companyId")),
                parseUUID(event.get("userId")),
                email,
                null,
                null,
                "order-confirmation",
                Map.of(
                        "orderId", orderId,
                        "orderTotal", event.get("total"),
                        "orderItems", event.get("items")
                ),
                null,
                null,
                language
        ));
    }
    
    private void handleOrderShipped(Map<String, Object> event) {
        String email = (String) event.get("customerEmail");
        String orderId = (String) event.get("orderId");
        String trackingNumber = (String) event.get("trackingNumber");
        String language = (String) event.get("language");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                parseUUID(event.get("companyId")),
                parseUUID(event.get("userId")),
                email,
                null,
                null,
                "order-shipped",
                Map.of(
                        "orderId", orderId,
                        "trackingNumber", trackingNumber != null ? trackingNumber : ""
                ),
                null,
                null,
                language
        ));
    }
    
    private void handleOrderDelivered(Map<String, Object> event) {
        String email = (String) event.get("customerEmail");
        String orderId = (String) event.get("orderId");
        String language = (String) event.get("language");
        
        emailService.sendEmail(new EmailService.SendEmailRequest(
                parseUUID(event.get("companyId")),
                parseUUID(event.get("userId")),
                email,
                null,
                null,
                "order-delivered",
                Map.of("orderId", orderId),
                null,
                null,
                language
        ));
    }
    
    private UUID parseUUID(Object value) {
        if (value == null) return null;
        if (value instanceof UUID) return (UUID) value;
        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
