# SMTP Configuration System

## Overview
This document describes the newly implemented SMTP configuration system that allows admins to manage email server settings through the UI instead of only environment variables.

## Architecture

### Database Layer
- **Table**: `smtp_configuration` (created via Flyway migration V3)
- **Fields**: SMTP host, port, username, password, email from, from name, TLS/SSL options
- **Support**: Global configuration (companyId = NULL) and company-specific configurations

### Backend (Java Spring Boot - Notification Service, Port 8082)

#### Entities
- `SmtpConfiguration.java` - JPA entity mapping to database table

#### Repositories
- `SmtpConfigurationRepository.java` - Data access layer with custom queries

#### Services
- `SmtpConfigurationService.java` - Business logic that:
  - Fetches configuration with fallback: Company DB → Global DB → Environment variables
  - Tests SMTP connections
  - Creates JavaMailSender instances

#### Controllers
- `SmtpConfigurationController.java` - REST API endpoints:
  - `GET /api/smtp-configuration` - Get current configuration
  - `POST /api/smtp-configuration` - Save configuration to database
  - `POST /api/smtp-configuration/test` - Test SMTP connection

#### Configuration
- `JpaConfiguration.java` - Enables JPA repositories and transaction management
- `CorsConfiguration.java` - Configures CORS for frontend access

### Frontend (React/TypeScript)

#### UI Component
- **Location**: `apps/frontend/src/pages/settings/SettingsPage.tsx`
- **Tab**: "SMTP Server" tab in Settings
- **Features**:
  - Form to input SMTP settings
  - Real-time status indicator (database vs environment)
  - Test connection button
  - Save configuration button
  - Error/success messages in all supported languages

#### Translations
- Added to all language files (en, de, fr, ru):
  - Field labels (SMTP Host, Port, Username, Password, From Email, From Name)
  - Status messages (saved, failed, connection success/failed)
  - Help text and descriptions

## Configuration Priority

The system uses this fallback chain:
1. **Company-specific database configuration** (if exists and active)
2. **Global database configuration** (if exists and active)
3. **Environment variables** from application.yml (default)

## How to Use

### Step 1: Restart Notification Service
After deploying this code, restart the Notification Service to apply migrations:
```bash
docker-compose restart notification-service
# or locally
cd apps/services/java/notification-service
./gradlew bootRun
```

### Step 2: Access Settings
1. Go to http://localhost:5173/settings
2. Click on "SMTP Server" tab
3. You'll see the form pre-filled with environment variable values

### Step 3: Test Connection (Optional)
1. Fill in the SMTP settings (or use pre-filled values)
2. Click "Test Connection" to verify settings work
3. Success message confirms connection

### Step 4: Save Configuration
1. Click "Save Configuration"
2. Configuration is saved to database
3. Status changes from "Using environment variables" to "Using database configuration"
4. Frontend reloads configuration to show saved values

## Database Initialization

### Via Flyway Migrations
The system automatically creates the table on first run:
- Migration file: `apps/services/java/notification-service/src/main/resources/db/migration/V3__Add_smtp_configuration.sql`
- Automatic execution on Notification Service startup

### Manual Table Creation
If needed, manually create the table:
```sql
CREATE TABLE smtp_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID UNIQUE,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(500),
    email_from VARCHAR(255) NOT NULL,
    email_from_name VARCHAR(255),
    use_tls BOOLEAN DEFAULT true,
    use_ssl BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID
);
```

## API Examples

### Get Current Configuration
```bash
curl http://localhost:8082/api/smtp-configuration
```

Response:
```json
{
  "config": {
    "id": "uuid",
    "smtpHost": "smtp.ionos.com",
    "smtpPort": 587,
    "smtpUsername": "user@example.com",
    "smtpPassword": "***",
    "emailFrom": "noreply@example.com",
    "emailFromName": "ERP System",
    "useTls": true,
    "useSsl": false,
    "isActive": true,
    "createdAt": "2026-01-10T12:00:00",
    "updatedAt": "2026-01-10T12:00:00"
  },
  "source": "database",
  "hasDbConfig": true
}
```

### Save Configuration
```bash
curl -X POST http://localhost:8082/api/smtp-configuration \
  -H "Content-Type: application/json" \
  -d '{
    "smtpHost": "smtp.ionos.com",
    "smtpPort": 587,
    "smtpUsername": "user@example.com",
    "smtpPassword": "password",
    "emailFrom": "noreply@example.com",
    "emailFromName": "ERP System",
    "useTls": true,
    "useSsl": false
  }'
```

### Test Connection
```bash
curl -X POST http://localhost:8082/api/smtp-configuration/test \
  -H "Content-Type: application/json" \
  -d '{
    "smtpHost": "smtp.ionos.com",
    "smtpPort": 587,
    "smtpUsername": "user@example.com",
    "smtpPassword": "password",
    "emailFrom": "noreply@example.com",
    "emailFromName": "ERP System",
    "useTls": true,
    "useSsl": false
  }'
```

## Troubleshooting

### Configuration Not Saving
1. **Check Notification Service is running**: Port 8082 should be accessible
2. **Check database connection**: Verify PostgreSQL is running and accessible
3. **Check logs**: Look at Notification Service logs for error details
4. **Verify migrations ran**: Check `flyway_schema_history` table in notification database

### Configuration Not Loading
1. **Check network**: Verify frontend can reach `http://localhost:8082`
2. **Check CORS**: Verify CorsConfiguration is applied
3. **Check browser console**: Look for network errors in developer tools

### Connection Test Failing
1. **Verify credentials**: Username and password are correct
2. **Check firewall**: SMTP server port is not blocked
3. **Check SSL/TLS**: Ensure SSL/TLS settings match your SMTP server
4. **Check from address**: Email From address must be valid for the SMTP account

## Security Considerations

- Passwords are masked (shown as `***`) in API responses
- Passwords are never logged
- Field is prepared for encryption before database storage
- Only super admin should have access to SMTP settings
- Consider implementing encryption for stored passwords in future

## Future Enhancements

1. **Encryption**: Encrypt passwords in database using Spring Security
2. **Company-specific configs**: Allow different SMTP servers per company
3. **Multiple configurations**: Support multiple SMTP profiles
4. **Audit logging**: Track who changed SMTP settings and when
5. **Health check endpoint**: Regular SMTP connection health monitoring
