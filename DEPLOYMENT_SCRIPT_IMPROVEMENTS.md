# Deployment Script Improvements - Session Summary

## Overview
The `scripts/deployment/deploy-to-server.sh` script has been enhanced to ensure reliable production deployments by addressing critical issues discovered during live troubleshooting.

## Key Improvements Made

### 1. ✅ Image Version Management (Already Set)
**Status**: DEFAULT IMAGE_VERSION = 1.3

**File**: [scripts/deployment/deploy-to-server.sh](scripts/deployment/deploy-to-server.sh#L72)

```bash
IMAGE_VERSION="${IMAGE_VERSION:-1.3}"
```

**Why This Matters**:
- Ensures consistent, stable version deployment
- Prevents accidental deployment of old `latest` tag
- All services (11 total) build and deploy with v1.3

### 2. ✅ DNS Cache Flushing Added
**Status**: IMPLEMENTED

**File**: [scripts/deployment/deploy-to-server.sh](scripts/deployment/deploy-to-server.sh#L805-L810)

**What Was Added**:
```bash
# Flush DNS cache to refresh service IPs (critical for gateway and nginx)
# This prevents "No route to host" or "Connection refused" errors from stale DNS caches
print_step "Flushing DNS caches to refresh service IPs..."
local dns_flush_cmd="cd /opt/erp-system && docker compose --env-file .env restart gateway nginx"
ssh_exec "$dns_flush_cmd"
sleep 5
```

**Why This Is Critical**:
- Docker Compose creates internal DNS entries for service names (company-service, gateway, etc.)
- When services restart, Docker assigns new container IPs
- Nginx and Apollo Gateway cache DNS resolutions in memory
- Without flushing, they continue using stale IPs
- **Error Pattern It Fixes**: 
  - "ECONNREFUSED 172.18.0.10:8080" (stale IP address)
  - "No route to host" errors
  - "Connection refused" errors from service-to-service calls
  
**Real-World Example**:
- Gateway tried to call company-service at old IP 172.18.0.10:8080
- New IP was 172.18.0.9 (after restart)
- Query failed until gateway + nginx were restarted

### 3. Database Password Synchronization (Verified)
**Status**: DOCUMENTED

**Issue Resolved**: All erp_* database users had mismatched passwords, causing connection failures.

**Users Reset**:
- erp_accounting
- erp_shop  
- erp_masterdata
- erp_company
- erp_translation
- erp_notification

**Password**: securepassword123 (matches DB_PASSWORD env var in .env)

## Architecture Impact

### Services Affected by DNS Caching
1. **Apollo Gateway** (port 4000) - Composes subgraphs from 8 services
   - Caches DNS for: user-service, accounting-service, masterdata-service, shop-service, company-service, translation-service, notification-service, templates-service
   
2. **Nginx Reverse Proxy** (port 80/443) - Routes external traffic
   - Caches DNS for: gateway, and all backend services
   - Critical for: /api/templates, GraphQL endpoints, Swagger docs

### Service Connectivity Chain
```
User → Nginx (DNS cache) → Gateway (DNS cache) → Company Service → PostgreSQL
                         ↓
                   Accounting Service → PostgreSQL
                   Shop Service → PostgreSQL
                   Masterdata Service → PostgreSQL
                   (etc.)
```

When any backend service restarts:
1. Docker assigns it a new IP
2. Nginx cache becomes stale
3. Gateway cache becomes stale
4. Both must be restarted to flush caches
5. ✅ Deployment script now does this automatically

## Testing the Improvements

### Verify Image Version Default
```bash
grep "IMAGE_VERSION=" scripts/deployment/deploy-to-server.sh
# Output: IMAGE_VERSION="${IMAGE_VERSION:-1.3}"
```

### Verify DNS Flushing is in Place
```bash
grep -A 5 "Flushing DNS caches" scripts/deployment/deploy-to-server.sh
```

### How to Test After Deployment
```bash
# Test GraphQL queries to verify services are communicating
curl -k 'https://shopping-now.net/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ companies { id name } }"}'

curl -k 'https://shopping-now.net/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ invoices { id number } }"}'

curl -k 'https://shopping-now.net/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ translations(lang: \"de\") { key } }"}'
```

## Hardcoded URL Fixes Applied

### Frontend
- **File**: [apps/frontend/src/lib/api/templates.ts](apps/frontend/src/lib/api/templates.ts)
- **Change**: `const API_BASE = '/api'` (relative URL, not localhost:8087)

### Templates Service  
- **File**: [apps/services/nodejs/templates-service/server.mjs](apps/services/nodejs/templates-service/server.mjs)
- **Change**: Dynamic host detection: `${req.protocol}://${req.get('host')}/api/templates/${id}/pdf`

### User Service (Email URLs)
- **File**: [apps/services/dotnet/UserService/Services/EmailService.cs](apps/services/dotnet/UserService/Services/EmailService.cs)
- **Changes**: 3 instances changed from `http://localhost:5173` to `https://shopping-now.net`
  - SendPasswordResetEmailAsync
  - SendEmailVerificationEmailAsync  
  - SendWelcomeEmailAsync

## Deployment Readiness Checklist

✅ IMAGE_VERSION defaults to 1.3 (newest stable)
✅ DNS cache flushing implemented and integrated
✅ All hardcoded localhost URLs removed from code
✅ Database passwords synchronized with .env
✅ Frontend deployed with correct image tag
✅ Templates service using dynamic host detection
✅ UserService email URLs using production domain

## Production Deployment Workflow

1. **Pre-Deployment**:
   - Update version in pom.xml, package.json, .csproj files
   - Run: `docker build` for all 11 services
   - Push to ghcr.io with tag (e.g., 1.3)
   - Update [scripts/deployment/deploy-to-server.sh](scripts/deployment/deploy-to-server.sh#L72) if using different version

2. **Deployment**:
   - Script automatically uses IMAGE_VERSION=1.3 (or override with env var)
   - Services are pulled and started: `docker compose up -d`
   - **NEW**: Gateway and Nginx are restarted to flush DNS caches
   - Database permissions are granted
   - Deployment verification runs

3. **Post-Deployment**:
   - Verify GraphQL queries working (companies, invoices, translations)
   - Check Nginx proxy logs for errors
   - Confirm HTTPS/SSL working
   - Monitor service logs for connection issues

## Future Enhancements

1. Add health check verification after DNS flushing
2. Implement automatic retry logic if services fail to connect
3. Add monitoring dashboard availability checks (Grafana, Prometheus)
4. Create comprehensive test suite to validate all service connectivity
5. Document all API endpoint locations for reference

## Related Files
- [scripts/deployment/deploy-to-server.sh](scripts/deployment/deploy-to-server.sh) - Main deployment script
- [docker-compose.yml](docker-compose.yml) - Service definitions
- [.env.example](.env.example) - Environment variables
- [infrastructure/nginx/nginx.conf](infrastructure/nginx/nginx.conf) - Nginx reverse proxy config

## References
- **Issue Pattern**: Docker Compose DNS caching after service restart
- **Solution Pattern**: Restart gateway + nginx after deployment
- **Error Symptoms**: ECONNREFUSED with IP addresses, "No route to host"
- **Root Cause**: Stale DNS cache in container network
- **Verification**: GraphQL queries succeed after DNS flush
