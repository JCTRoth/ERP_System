# Deployment Fixes - January 18, 2026

## Issue Summary

After deploying the ERP system to production server (95.111.254.120 / shopping-now.net), the login page was returning HTTP 502 errors when trying to fetch GraphQL translations. The root cause was a combination of database configuration issues preventing services from starting properly.

## Root Causes Identified

### 1. Database Naming Inconsistency
- **Problem**: Services were configured with `*_db` database names (e.g., `user_db`, `company_db`), but the PostgreSQL init script created databases without underscores (e.g., `userdb`, `companydb`)
- **Impact**: All .NET services and some Java services couldn't connect to their databases
- **Services Affected**: 
  - user-service
  - accounting-service
  - masterdata-service
  - shop-service
  - company-service

### 2. Wrong Database Users
- **Problem**: .NET services were configured to use the generic `postgres` superuser instead of dedicated service users (`erp_*`)
- **Impact**: Poor security posture and potential permission issues
- **Services Affected**: All .NET services (user, accounting, masterdata, shop)

### 3. Password Authentication Failures
- **Problem**: The `erp_*` database users didn't have the correct password set
- **Impact**: Even when database names were fixed, services couldn't authenticate
- **Services Affected**: All services using erp_* users

### 4. Notification Service Flyway Migration Issues
- **Problem**: Flyway migration checksum validation failures prevented notification-service from starting
- **Impact**: Gateway couldn't complete Apollo Federation composition (waiting for all subgraphs)
- **Resolution**: Disabled notification-service temporarily by commenting it out and setting `NOTIFICATION_SERVICE_URL: ""` in gateway

### 5. Nginx Configuration Reference to Disabled Service
- **Problem**: Nginx configuration included proxy rules for notification-service, causing nginx to crash on startup when the service was stopped
- **Impact**: Entire site became unavailable (HTTPS connection refused)
- **Resolution**: Commented out notification-service proxy location in nginx config

### 6. Gateway IP Address Caching
- **Problem**: After gateway restarts, it gets a new Docker network IP, but nginx cached the old IP
- **Impact**: nginx returned 502 errors even though gateway was running
- **Resolution**: Restart nginx after gateway restarts to pick up new IP (or use service name instead of IP in nginx config, which Docker DNS handles)

## Fixes Applied

### Database Connection Strings (deploy-to-server.sh)

**Before:**
```yaml
ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=user_db;User Id=postgres;Password=${DB_PASSWORD};"
```

**After:**
```yaml
ConnectionStrings__DefaultConnection: "Server=postgres;Port=5432;Database=userdb;User Id=erp_user;Password=${DB_PASSWORD};"
```

Applied to all .NET services:
- ✅ user-service: `Database=userdb;User Id=erp_user`
- ✅ accounting-service: `Database=accountingdb;User Id=erp_accounting`
- ✅ masterdata-service: `Database=masterdatadb;User Id=erp_masterdata`
- ✅ shop-service: `Database=shopdb;User Id=erp_shop`

Java services (company, translation):
- ✅ company-service: Changed `company_db` → `companydb`
- ✅ translation-service: Already correct (`translationdb`)

### Gateway Environment Variables

**Before:**
```yaml
environment:
  USER_SERVICE_URL: http://user-service:5000/graphql/
  COMPANY_SERVICE_URL: http://company-service:8080/graphql
  TRANSLATION_SERVICE_URL: http://translation-service:8081/graphql
```

**After:**
```yaml
environment:
  USER_SERVICE_URL: http://user-service:5000/graphql/
  COMPANY_SERVICE_URL: http://company-service:8080/graphql
  TRANSLATION_SERVICE_URL: http://translation-service:8081/graphql
  NOTIFICATION_SERVICE_URL: ""  # Disabled
```

### Notification Service Configuration

**Before:**
```yaml
  notification-service:
    image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-notification-service:${IMAGE_VERSION}
    # ... full service definition
```

**After:**
```yaml
  # notification-service - DISABLED due to Flyway migration validation issues
  # notification-service:
  #   image: ${REGISTRY_URL}/${REGISTRY_USERNAME}/erp-notification-service:${IMAGE_VERSION}
  #   # ... commented out
```

### Nginx Proxy Configuration

**Before:**
```nginx
# Notification Service API
location /api/smtp-configuration {
    proxy_pass http://notification-service:8082/api/smtp-configuration;
    # ...
}
```

**After:**
```nginx
# # Notification Service API - DISABLED due to Flyway migration issues
# location /api/smtp-configuration {
#     proxy_pass http://notification-service:8082/api/smtp-configuration;
#     # ...
# }
```

## Manual Server Fixes Applied

These were applied directly on the server at 95.111.254.120 during troubleshooting:

```bash
# Fix database connection strings
cd /opt/erp-system
sed -i 's/Database=masterdata_db/Database=masterdatadb/g' docker-compose.yml
sed -i 's/Database=company_db/Database=companydb/g' docker-compose.yml
sed -i 's/User Id=postgres/User Id=erp_masterdata/g' docker-compose.yml  # repeated for each service

# Set correct passwords for database users
docker exec erp_system-postgres psql -U postgres -c "ALTER USER erp_shop PASSWORD 'securepassword123';"
docker exec erp_system-postgres psql -U postgres -c "ALTER USER erp_masterdata PASSWORD 'securepassword123';"
docker exec erp_system-postgres psql -U postgres -c "ALTER USER erp_company PASSWORD 'securepassword123';"
docker exec erp_system-postgres psql -U postgres -c "ALTER USER erp_translation PASSWORD 'securepassword123';"

# Disable notification-service in gateway
sed -i '/TRANSLATION_SERVICE_URL:/a\      NOTIFICATION_SERVICE_URL: ""' docker-compose.yml

# Comment out notification-service proxy in nginx
sed -i '/# Notification Service API/,/^    }/s/^/# /' nginx/conf.d/default.conf

# Restart services
docker compose up -d masterdata-service
docker compose up -d company-service
docker restart erp_system-translation-service
docker compose up -d gateway
docker restart erp_system-nginx
```

## Verification

After all fixes were applied:

```bash
# Test GraphQL endpoint
curl -k -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' \
  https://shopping-now.net/graphql

# Response: {"data":{"__typename":"Query"}}

# Test translations query (the one that was failing on login page)
curl -k -X POST -H "Content-Type: application/json" \
  -d '{"operationName":"GetTranslations","variables":{"language":"de","companyId":null},"query":"query GetTranslations($language: String!, $companyId: ID) { translations(language: $language, companyId: $companyId) { key value __typename } }"}' \
  https://shopping-now.net/graphql

# Response: {"data":{"translations":[{"key":"common.actions.save","value":"Speichern",...}]}}

# Check service status
docker ps --format "table {{.Names}}\t{{.Status}}"

# All services running:
# - gateway (healthy)
# - company-service (healthy)
# - translation-service (running)
# - user-service (running)
# - accounting-service (running)
# - masterdata-service (running)
# - shop-service (running)
# - postgres (healthy)
# - nginx (running)
# - frontend (healthy)
# - templates-service (running)
```

## Files Modified

1. `/home/jonas/Git/ERP_System/scripts/deployment/deploy-to-server.sh`
   - Fixed all database connection strings
   - Disabled notification-service
   - Added NOTIFICATION_SERVICE_URL to gateway
   - Commented out notification-service nginx proxy

2. Server files (already updated manually, will be overwritten on next deployment):
   - `/opt/erp-system/docker-compose.yml`
   - `/opt/erp-system/nginx/conf.d/default.conf`

## Deployment Checklist Updates

### Before Next Deployment

1. **Database Users**: Ensure all `erp_*` users exist with correct password:
   ```sql
   ALTER USER erp_user PASSWORD 'securepassword123';
   ALTER USER erp_shop PASSWORD 'securepassword123';
   ALTER USER erp_accounting PASSWORD 'securepassword123';
   ALTER USER erp_masterdata PASSWORD 'securepassword123';
   ALTER USER erp_company PASSWORD 'securepassword123';
   ALTER USER erp_translation PASSWORD 'securepassword123';
   ALTER USER erp_notification PASSWORD 'securepassword123';
   ```

2. **Database Naming**: Verify init script creates databases without underscores:
   - userdb ✓
   - shopdb ✓
   - accountingdb ✓
   - masterdatadb ✓
   - companydb ✓
   - translationdb ✓
   - notificationdb ✓
   - templatesdb ✓

3. **Service Dependencies**: If re-enabling notification-service:
   - Fix Flyway migration checksums (drop and recreate schema)
   - Uncomment service in docker-compose
   - Remove `NOTIFICATION_SERVICE_URL: ""` from gateway
   - Uncomment nginx proxy location

## Lessons Learned

1. **Consistent Naming Conventions**: Database names must match between init scripts and service configurations. The init script uses `*db` format, so all services must use the same.

2. **Service-Specific Users**: Each microservice should have its own database user with minimal privileges. Never use the postgres superuser in production.

3. **Gateway Composition Dependencies**: Apollo Gateway with IntrospectAndCompose requires ALL configured subgraphs to be available. Use empty string (`""`) to explicitly disable services.

4. **Nginx Service Discovery**: Nginx caches DNS lookups. After restarting services that change IPs, nginx should be restarted too. Better solution: use Docker service names (which nginx already does, but the restart is still needed to clear connection pools).

5. **Flyway Migration Integrity**: Flyway checksum validation ensures migration consistency. If migrations are changed after deployment, the schema history table must be cleaned or the checksums updated.

6. **Deployment Script Testing**: Always test deployment scripts in a staging environment before production. Database connection string mismatches would have been caught in pre-production testing.

## Status

✅ **RESOLVED**: All services are running and GraphQL API is accessible
✅ **Login page works**: Translations query returns successfully  
✅ **Login mutation works**: User authentication successful
✅ **Deployment scripts updated**: Future deployments will have correct configuration
⚠️ **Notification-service disabled**: Needs Flyway migration fixes before re-enabling
⚠️ **Init script needs update**: Database user passwords hardcoded as 'postgres' instead of using environment variable

## Additional Fixes Applied (Login Error)

After the initial deployment fixes, login was still failing with "Unexpected Execution Error". Investigation revealed:

### Problem
User-service couldn't connect to database because:
1. The `userdb` database didn't exist (only `user_db` existed from a previous deployment)
2. The `erp_user` database user didn't exist
3. Docker Compose changes to environment variables weren't applied because containers were only restarted, not recreated

### Solution
```bash
# Create erp_user
docker exec erp_system-postgres psql -U postgres -c "CREATE USER erp_user WITH PASSWORD 'securepassword123';"

# Create userdb database
docker exec erp_system-postgres psql -U postgres -c "CREATE DATABASE userdb OWNER erp_user;"

# Grant schema privileges
docker exec erp_system-postgres psql -U postgres -d userdb -c "GRANT ALL PRIVILEGES ON SCHEMA public TO erp_user;"

# Copy data from old database to new
docker exec erp_system-postgres pg_dump -U postgres user_db | docker exec -i erp_system-postgres psql -U erp_user -d userdb

# Recreate services with docker-compose (not just restart!)
docker compose up -d user-service accounting-service

# Copy accounting data too
docker exec erp_system-postgres pg_dump -U postgres accounting_db | docker exec -i erp_system-postgres psql -U erp_accounting -d accountingdb
```

### Lesson Learned
**CRITICAL**: When changing Docker Compose environment variables, you MUST use `docker compose up -d <service>` to recreate the container. Using `docker restart` will NOT pick up environment variable changes!

## Next Steps

1. **Test complete user flow**: Login → Create orders → Generate invoices
2. **Fix notification-service Flyway migrations**: 
   - Review migration files
   - Clean corrupt schema history
   - Re-enable service
3. **Add database initialization validation** to deployment script:
   - Check that all databases exist
   - Verify all users have correct passwords
   - Test connections before starting services
4. **Document notification service fix** when resolved
5. **Create automated deployment tests** to catch configuration mismatches
