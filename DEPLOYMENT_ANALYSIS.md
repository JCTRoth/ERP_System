# ERP System Deployment Analysis

**Date**: January 11, 2026  
**Status**: Comprehensive Analysis Complete

---

## Executive Summary

This analysis examines the deployment infrastructure for the ERP System, comparing deployment scripts with the existing docker-compose configuration and the container-host-setup.sh script used for server setup.

### Key Findings:
- **3 Deployment Scripts** exist in `scripts/deployment/`
- **3 Docker Compose files** are defined (only 2 actually used)
- **Production-ready infrastructure** is in place but needs coordination
- **Strong alignment** between deployment scripts and host setup script

---

## 1. DEPLOYMENT SCRIPTS ANALYSIS

### 1.1 `scripts/deployment/deploy-to-registry.sh`

**Purpose**: Build and push all 11 ERP services to GitHub Container Registry (GHCR)

**Services Built** (11 total):
1. **frontend** - React 18 + TypeScript frontend
2. **gateway** - Apollo Gateway (GraphQL Federation)
3. **user-service** - .NET 8 (User management)
4. **shop-service** - .NET 8 (Product/Shop management)
5. **accounting-service** - .NET 8 (Accounting & invoicing)
6. **masterdata-service** - .NET 8 (Master data management)
7. **orders-service** - .NET 8 (Orders management)
8. **company-service** - Java Spring Boot (Company data)
9. **translation-service** - Java Spring Boot (Translations)
10. **notification-service** - Java Spring Boot (Email notifications)
11. **scripting-service** - Java Spring Boot (Custom scripting)

**Key Features**:
- Authenticates with GHCR using GitHub PAT (Personal Access Token)
- Supports config file or environment variables
- Parallel build capability (not yet fully implemented - sequential)
- Dry-run mode for testing
- Color-coded output for clarity

**Configuration Options**:
```bash
--config FILE              # JSON configuration file
--registry URL             # Container registry URL (default: ghcr.io)
--username USER            # GitHub username
--token TOKEN              # GitHub PAT
--version TAG              # Image version (default: latest)
--dry-run                  # Preview without building
--parallel N               # Number of parallel builds
```

**Issues/Gaps**:
- Parallel build code references `pids` array but doesn't actually implement parallel execution
- All builds are sequential
- No error recovery mechanism if one service fails

---

### 1.2 `scripts/deployment/deploy-to-server.sh`

**Purpose**: Deploy ERP system to production server with SSL, HTTPS, and health checks

**Capabilities**:
- SSH connection to remote server
- Docker Compose deployment
- Let's Encrypt SSL certificate setup
- HTTP → HTTPS redirect verification
- Service health checks
- Automated database initialization
- Docker Swarm or k3s orchestration support

**Configuration Options**:
```bash
--config FILE              # JSON configuration file
--server HOST              # Production server hostname/IP
--domain DOMAIN            # Domain name for SSL
--username USER            # SSH username (default: root)
--port PORT                # SSH port (default: 22)
--ssh-key PATH             # Path to SSH private key
--registry-url URL         # Container registry URL
--registry-user USER       # GitHub username
--registry-token TOK       # GitHub PAT
--image-version TAG        # Image version to deploy
--email EMAIL              # Email for Let's Encrypt
--db-password PASS         # PostgreSQL password
--dry-run                  # Preview deployment
```

**Key Features**:
- Validates SSH connectivity before deployment
- Creates temporary directories for configuration
- Generates deployment summary
- HTTPS verification with curl checks
- Health endpoint monitoring

**Issues/Gaps**:
- Script is very large (753 lines) - needs modularization
- Not all functionality is complete (WIP indicators in code)
- No automatic rollback capability
- Limited error recovery

---

### 1.3 `scripts/deployment/interactive-deploy.sh`

**Purpose**: Interactive, user-friendly deployment script with step-by-step guidance

**Workflow**:
1. Collects GitHub credentials
2. Prompts for version tag
3. Validates Docker installation
4. Authenticates with GHCR
5. Builds services sequentially
6. Reports success/failure

**Services**: Same 11 as deploy-to-registry.sh

**Usage**:
```bash
./scripts/deployment/interactive-deploy.sh
```

**Features**:
- Color-coded output (green/red/yellow)
- Clear progress indicators
- Error handling with informative messages
- Dry-run mode available
- No command-line arguments needed (all prompts are interactive)

---

## 2. DOCKER-COMPOSE FILES ANALYSIS

### 2.1 File Overview

Three docker-compose files exist in the project root:

| File | Purpose | Status | Usage |
|------|---------|--------|-------|
| `docker-compose.yml` | Production configuration | ✅ USED | Primary production file |
| `docker-compose.dev.yml` | Development configuration | ✅ USED | Local development |
| `docker-compose.override.yml` | Override/selective services | ❌ UNUSED | Can be deleted |

---

### 2.2 `docker-compose.yml` (Production)

**Purpose**: Production-ready configuration referencing GHCR images

**Services** (14 total):

#### Database & Infrastructure
- **postgres** - PostgreSQL 16 (consolidated single instance)
- ~~**minio**~~ - Object storage (commented out)
- ~~**prometheus**~~ - Monitoring (commented out)
- ~~**grafana**~~ - Dashboard (commented out)

#### .NET Services (Port mapping included)
- **user-service** - Port 5000 (internal)
- **shop-service** - Port 5003 (internal)
- **accounting-service** - Port 5001 (internal)
- **masterdata-service** - Port 5002 (internal)
- **orders-service** - Port 5004 (internal)

#### Java Services
- **company-service** - Port 8080 (internal)
- **translation-service** - Port 8081 (internal)
- **notification-service** - Port 8082 (internal)
- **scripting-service** - Port 8084 (internal)
- **edifact-service** - Port 8085 (internal)

#### Node.js Services
- **templates-service** - Port 8087 (internal)

#### Frontend & Gateway
- **gateway** - Port 4000 (exposed)
- **frontend** - Port 3000 (exposed, serves on 80)

#### Nginx
- ~~**nginx**~~ - Reverse proxy (commented out - using system nginx)

**Key Features**:
- All services use `ghcr.io/jctroth/erp-*:latest` images
- Health checks on postgres
- Resource limits defined (`cpus` and `memory`)
- Restart policy: `on-failure`
- Single network: `backend`
- Single volume: `postgres-data`
- Environment variables for production use
- `deploy` sections with resource constraints

**Database Credentials** (insecure for production):
```
Default password: securepassword123
Username scheme: erp_<service_name>
```

**Issues**:
- Hardcoded passwords in compose file
- Uses `latest` tag (should be pinned to version)
- Missing environment variable substitution
- Nginx commented out (relying on system nginx instead)

---

### 2.3 `docker-compose.dev.yml` (Development)

**Purpose**: Local development with hot-reload and mounted volumes

**Services** (same 11 + postgres + minio + prometheus + grafana):

#### Build Strategy
- All services use local `build:` context instead of pre-built images
- Frontend and gateway use `Dockerfile.dev` for hot-reload
- .NET services target `development` stage in Dockerfile

#### Volume Mounts
- Source code mounted for live reloading
- `.gradle` and `build` directories excluded (for Java)
- `/app/node_modules` excluded (for Node.js)

#### Networking
- Frontend (5173) → Gateway (4000)
- Gateway (4000) → All backend services
- All services → postgres (5432)

#### Features
- Short service startup with minimal config
- Extensive environment variables for development
- Database credentials: `postgres` (simple for dev)
- Monitoring stack included (Prometheus, Grafana)
- MinIO for S3-compatible storage

**Ports Exposed**:
- Frontend: 5173
- Gateway: 4000
- User Service: 5000
- Shop Service: 5003
- Accounting Service: 5001
- Masterdata Service: 5002
- Orders Service: 5004
- Company Service: 8080
- Translation Service: 8081
- Notification Service: 8082
- Scripting Service: 8084
- Edifact Service: 8085
- Templates Service: 8087
- PostgreSQL: 15432
- MinIO (API): 9000
- MinIO (Console): 9001
- Prometheus: 9090
- Grafana: 3001

---

### 2.4 `docker-compose.override.yml` (UNUSED)

**Purpose**: Selective service disabling via profiles

**Content**:
```yaml
services:
  shop-service:
    profiles: ["full"]
  accounting-service:
    profiles: ["full"]
  # ... more services with profiles: ["full"]
```

**Status**: **❌ UNUSED**

This file attempts to use Docker Compose profiles to selectively disable services, but:
1. It's not referenced in any startup scripts
2. Development compose already has selective service mounting
3. Production compose doesn't use profiles
4. **Can be safely deleted**

---

## 3. DOCKERFILE ANALYSIS

### 3.1 Identified Dockerfiles (11 total)

All use multi-stage builds with production/development targets:

#### Frontend
- `apps/frontend/Dockerfile` - Multi-stage (builder + nginx)
- `apps/frontend/Dockerfile.dev` - Development with hot-reload

#### Gateway
- `apps/gateway/Dockerfile` - Node.js multi-stage
- `apps/gateway/Dockerfile.dev` - Development with hot-reload

#### .NET Services (4 services)
- `apps/services/dotnet/UserService/Dockerfile`
- `apps/services/dotnet/ShopService/Dockerfile`
- `apps/services/dotnet/AccountingService/Dockerfile`
- `apps/services/dotnet/MasterdataService/Dockerfile`
- `apps/services/dotnet/OrdersService/Dockerfile`

#### Java Services (5 services)
- `apps/services/java/company-service/Dockerfile`
- `apps/services/java/translation-service/Dockerfile`
- `apps/services/java/notification-service/Dockerfile`
- `apps/services/java/scripting-service/Dockerfile`
- `apps/services/java/edifact-service/Dockerfile`

#### Node.js Services
- `apps/services/nodejs/templates-service/Dockerfile`

**Pattern**: All use multi-stage builds with separate development and production stages.

---

## 4. CONTAINER-HOST-SETUP.sh ANALYSIS

### 4.1 Server Setup Responsibilities

The container-host-setup.sh script (2400+ lines) handles:

#### Security Hardening
- **SSH Hardening**: Disables root login, enables key-only auth, custom port
- **UFW Firewall**: Denies all incoming except SSH and service ports
- **Fail2Ban**: Brute-force protection with ban rules
- **SSHGuard**: Real-time attack detection
- **Unattended Upgrades**: Automatic security updates

#### User Management
- **Admin User**: Non-root user with sudo access
- **Recovery Admin**: Failsafe account with separate SSH key
- **Docker Group**: Configured for non-root docker access

#### Container Orchestration (Choose one)
- **k3s**: Lightweight Kubernetes with containerd
- **Docker Swarm**: Docker CE with Swarm mode

#### Infrastructure
- **Nginx**: Reverse proxy and container router
- **Certbot**: Let's Encrypt SSL certificates
- **Port Management**: Custom port configuration for all services
- **Monitoring**: Portainer for Swarm or kubectl for k3s

#### System Configuration
- **Port Obfuscation**: Custom SSH and k3s API ports
- **Log Rotation**: JSON file logging with size limits
- **Error Handling**: Comprehensive error reporting
- **Report Generation**: Detailed setup summary

### 4.2 Alignment with Deployment Scripts

**Excellent Alignment** ✅

| Aspect | Script Status |
|--------|---|
| SSH Port Support | ✅ Both respect custom SSH port |
| Docker Setup | ✅ Host script sets up Docker |
| k3s/Swarm Support | ✅ Host script provisions both |
| SSL/TLS | ✅ Host script handles Certbot |
| UFW Firewall | ✅ Host script configures UFW |
| Admin User | ✅ SSH key-based auth configured |
| Error Handling | ✅ Both have robust error handling |

**Integration Points**:
1. Host setup creates admin user with SSH key → Deployment script uses this user
2. Host setup opens Docker service ports → Deployment script uses these ports
3. Host setup configures Nginx reverse proxy → Frontend/Gateway served through it
4. Host setup enables k3s/Swarm → Deployment script deploys to orchestrator

---

## 5. CURRENT USAGE PATTERNS

### 5.1 Development Workflow
```bash
# Start local dev environment
docker-compose -f docker-compose.dev.yml up -d

# Services accessible at:
# - Frontend: http://localhost:5173
# - Gateway: http://localhost:4000
# - Database: localhost:15432
```

### 5.2 Production Deployment Workflow
```bash
# Step 1: Build and push images to GHCR
./scripts/deployment/interactive-deploy.sh
# OR
./scripts/deployment/deploy-to-registry.sh --config config.json

# Step 2: Set up production server
sudo bash /path/to/container-host-setup.sh --yes --admin-user containeruser --admin-key "ssh-ed25519 ..."

# Step 3: Deploy to production server
./scripts/deployment/deploy-to-server.sh --config production.json
```

### 5.3 Current Limitations
1. **No version pinning**: Images use `latest` tag
2. **No health checks**: No automated monitoring of deployed services
3. **No rollback**: No mechanism to revert failed deployments
4. **Manual orchestration**: No CI/CD pipeline integration
5. **Environment variable management**: Hardcoded in compose files

---

## 6. RECOMMENDED ACTIONS

### 6.1 IMMEDIATE (Delete Unused Files)

```bash
# Delete unused docker-compose file
rm /home/jonas/Git/ERP_System/docker-compose.override.yml
```

**Reason**: The file is not used and creates confusion about which compose files are active.

### 6.2 SHORT-TERM (Next Steps)

1. **Create Production Compose Template**
   - File: `docker-compose.production.yml.example`
   - Purpose: Template with environment variable placeholders
   - Variables to parameterize:
     - Image versions
     - Database passwords
     - JWT secrets
     - SMTP configuration
     - Domain names

2. **Fix Image Tagging**
   - Update deployment scripts to use version tags instead of `latest`
   - Example: `ghcr.io/jctroth/erp-user-service:v1.0.0`

3. **Environment Variable Strategy**
   - Create `.env.example` for development
   - Create `.env.production.example` for production
   - Update docker-compose files to reference `${VARIABLE}` syntax

4. **Testing the Production Setup**
   ```bash
   # Dry-run the deployment
   ./scripts/deployment/deploy-to-server.sh --dry-run --config config.json
   ```

### 6.3 MEDIUM-TERM (Enhancements)

1. **Add Health Check Endpoints**
   - Each service should expose `/health` endpoint
   - Docker Compose should monitor these endpoints

2. **Implement Logging Strategy**
   - Centralize logs from all containers
   - Use ELK stack or similar for log analysis
   - Currently using JSON file logging

3. **Add Monitoring & Alerts**
   - Uncomment and configure Prometheus + Grafana
   - Set up alerting for service failures
   - Monitor resource usage

4. **CI/CD Integration**
   - GitHub Actions workflow for automated builds
   - Automatic tagging of versions
   - Integration with deployment scripts

### 6.4 LONG-TERM (Architecture)

1. **Kubernetes Migration** (if scaling is needed)
   - Use Helm charts instead of plain docker-compose
   - Add ingress controller for routing
   - Implement auto-scaling policies

2. **Database Migration Strategy**
   - Implement database backup/restore procedures
   - Plan for zero-downtime deployments
   - Handle schema migrations safely

3. **Disaster Recovery**
   - Document backup procedures
   - Test restore processes
   - Implement multi-region deployment

---

## 7. DEPLOYMENT READINESS CHECKLIST

### Before Production Deployment:

- [ ] Images built and pushed to GHCR with version tags
- [ ] Server provisioned using container-host-setup.sh
- [ ] SSH key verified working for deployment user
- [ ] UFW firewall rules validated
- [ ] Database initialized with seed data
- [ ] SMTP configuration validated
- [ ] SSL certificates obtained via Let's Encrypt
- [ ] HTTP → HTTPS redirect verified
- [ ] All services responding on health endpoints
- [ ] Nginx reverse proxy correctly routing traffic
- [ ] Fail2Ban active and monitoring logs
- [ ] Backup procedures documented and tested

---

## 8. SUMMARY TABLE

| Component | Status | Health | Priority |
|-----------|--------|--------|----------|
| Deployment Scripts | ✅ Exist | 🟡 Partial | 🔴 High |
| Docker Compose (Dev) | ✅ Complete | ✅ Good | 🟢 Low |
| Docker Compose (Prod) | ✅ Complete | 🟡 Needs params | 🔴 High |
| docker-compose.override.yml | ❌ Unused | ❌ Delete | 🟢 Low |
| Host Setup Script | ✅ Excellent | ✅ Good | 🟢 Low |
| Dockerfile Standards | ✅ Consistent | ✅ Good | 🟢 Low |
| CI/CD Integration | ❌ Missing | ❌ None | 🔴 High |
| Monitoring/Alerts | ❌ Missing | ❌ None | 🔴 High |
| Environment Mgmt | ❌ Weak | 🟡 Hardcoded | 🔴 High |

---

## 9. QUESTIONS FOR USER

1. **Deployment Target**: Will deployment be to k3s or Docker Swarm?
2. **Version Strategy**: How should versions be tagged/managed?
3. **Database**: Will PostgreSQL be managed within Docker or externally?
4. **Monitoring**: Should we enable Prometheus/Grafana stack?
5. **CI/CD**: Should GitHub Actions be integrated for automated builds?
6. **SSL Domains**: What domain names should certificates cover?

---

**Next Step**: Run production deployment test to verify all components work together.

