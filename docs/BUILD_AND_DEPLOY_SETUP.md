# ERP System Build & Deployment Scripts - Complete Setup Guide

## What's Been Created

I've created a complete build and deployment automation system for your ERP application. Here's what's included:

### Scripts

1. **`scripts/build-and-push.sh`** (9.9 KB)
   - Build all 11 containers on your local machine
   - Push them to your private GitHub Container Registry
   - Supports CLI args, JSON config, or interactive prompts
   - Parallel build support
   - Dry-run mode for testing

2. **`scripts/deploy-production.sh`** (22 KB)
   - Deploy to production server via SSH
   - Automatic Let's Encrypt SSL setup
   - HTTP→HTTPS redirect configuration
   - Health check verification
   - Supports CLI args, JSON config, or interactive prompts
   - Dry-run mode for testing

3. **`scripts/docker-compose.production.yml`** (Production compose file)
   - Ready-to-use compose configuration
   - Includes all 11 services + PostgreSQL
   - Nginx reverse proxy with SSL
   - Proper environment variables
   - Health checks and auto-restart policies

4. **`scripts/config.example.json`** (Configuration template)
   - Example configuration for both build and deploy
   - Copy and customize for your environment

### Configuration Files

1. **`.github/workflows/deploy.yml`** (GitHub Actions CI/CD)
   - Automatically build and deploy on git tag push
   - Manual trigger option
   - Full integration with secrets management

2. **`docs/DEPLOYMENT_GUIDE.md`** (Comprehensive guide)
   - Step-by-step deployment instructions
   - Prerequisites and setup
   - Troubleshooting guide
   - Security best practices
   - Post-deployment management

3. **`scripts/README.md`** (Scripts reference)
   - Quick reference for all scripts
   - Usage examples
   - Environment variables
   - Troubleshooting

---

## Quick Start

### 1. Build and Push Images to GHCR

```bash
# Option A: Interactive (prompts for values)
./scripts/build-and-push.sh

# Option B: Command-line arguments
./scripts/build-and-push.sh \
  --username JCTRoth \
  --token ghp_your_token_here \
  --version 1.0.0

# Option C: Configuration file
cp scripts/config.example.json my-config.json
# Edit my-config.json with your values
./scripts/build-and-push.sh --config my-config.json

# Preview without building (dry-run)
./scripts/build-and-push.sh --dry-run --username JCTRoth
```

### 2. Deploy to Production

```bash
# Option A: Interactive (prompts for values)
./scripts/deploy-production.sh

# Option B: Command-line arguments
./scripts/deploy-production.sh \
  --server prod.example.com \
  --domain erp.example.com \
  --email admin@example.com \
  --registry-token ghp_xxx \
  --db-password MySecurePassword123

# Option C: Configuration file
./scripts/deploy-production.sh --config deploy-config.json

# Preview deployment (dry-run)
./scripts/deploy-production.sh \
  --server prod.example.com \
  --domain erp.example.com \
  --dry-run
```

---

## Prerequisites

### Local Development Machine

```bash
# Docker (with buildx for multi-platform builds)
docker --version
docker buildx version

# jq (for JSON parsing)
sudo apt-get install jq

# bash 4+
bash --version

# GitHub Personal Access Token (ghp_*)
# with 'write:packages' and 'read:packages' scopes
# Create at: https://github.com/settings/tokens
```

### Production Server

```bash
# SSH access with key-based auth
# Open ports: 80 (HTTP), 443 (HTTPS)
# Docker and Docker Compose installed
# (Use the container-host-setup.sh script)
# 4GB+ RAM, 20GB+ storage

# Test SSH connectivity:
ssh -i ~/.ssh/id_rsa root@prod.example.com "docker --version"
```

---

## Key Features

### Build Script (`build-and-push.sh`)

✅ **Builds all 11 services:**
- frontend (React)
- gateway (Apollo GraphQL)
- user-service, shop-service, accounting-service, masterdata-service, orders-service (.NET)
- company-service, translation-service, notification-service, scripting-service (Java)

✅ **Features:**
- Automatic GHCR authentication
- Parallel builds (configurable)
- Dry-run mode (preview only)
- JSON configuration file support
- Environment variable support
- Interactive prompt mode
- Detailed status output
- Comprehensive error handling

### Deployment Script (`deploy-production.sh`)

✅ **Features:**
- Automated SSH deployment
- Let's Encrypt certificate setup
- HTTP→HTTPS redirect configuration
- Nginx reverse proxy
- Health check verification
- Service status monitoring
- Dry-run mode
- JSON configuration support
- Interactive prompt mode
- Post-deployment verification

### GitHub Actions CI/CD

✅ **Features:**
- Automatic build on git tag push (v1.0.0)
- Manual trigger with custom version
- Secure secrets management
- Parallel build and deploy jobs
- Deployment notifications

---

## Configuration Data Required

### For Building & Pushing

| Field | Example | Notes |
|-------|---------|-------|
| GitHub Username | JCTRoth | Your GitHub username |
| GitHub Token | ghp_xxx | PAT with write:packages scope |
| Registry URL | ghcr.io | GitHub Container Registry |
| Image Version | 1.0.0 | Version tag for images |
| Parallel Builds | 2-4 | Number of parallel builds |

### For Deployment

| Field | Example | Notes |
|-------|---------|-------|
| Server | prod.example.com | Hostname or IP address |
| Domain | erp.example.com | Domain for SSL certificate |
| SSH Username | root | SSH user on server |
| SSH Key | ~/.ssh/id_rsa | Private key for authentication |
| Registry Token | ghp_xxx | Same as build token |
| Image Version | 1.0.0 | Match the version you built |
| LE Email | admin@example.com | For Let's Encrypt notifications |
| DB Password | secure_pass | PostgreSQL password (16+ chars) |

---

## Usage Patterns

### Pattern 1: Local Development Only

```bash
# Use existing start-local.sh
./scripts/start-local.sh
```

### Pattern 2: Manual Build and Deploy

```bash
# Step 1: Build images
./scripts/build-and-push.sh --username JCTRoth --token ghp_xxx --version 1.0.0

# Step 2: Deploy to production
./scripts/deploy-production.sh --server prod.example.com --domain erp.example.com
```

### Pattern 3: Automated CI/CD with GitHub Actions

```bash
# Just push a tag, everything happens automatically
git tag v1.0.0
git push origin v1.0.0

# Or manually trigger in GitHub Actions UI
# Actions > Deploy > Run workflow > Enter version
```

### Pattern 4: Configuration Files

```bash
# Create config files
cat > build-config.json << 'EOF'
{
  "github_username": "JCTRoth",
  "github_token": "ghp_xxx",
  "image_version": "1.0.0"
}
EOF

cat > deploy-config.json << 'EOF'
{
  "deploy_server": "prod.example.com",
  "deploy_domain": "erp.example.com",
  "registry_token": "ghp_xxx",
  "db_password": "secure_password"
}
EOF

# Use them
./scripts/build-and-push.sh --config build-config.json
./scripts/deploy-production.sh --config deploy-config.json
```

---

## Services Architecture

```
┌─────────────────────────────────────┐
│     GHCR (Private Registry)         │
│  ghcr.io/jctroth/erp-*              │
└─────────────────────────────────────┘
         ▲              │
         │              │
   build │              │ deploy pull
         │              ▼
    ┌────────────────────────────────┐
    │  Your Local Machine             │
    │  - Docker                       │
    │  - build-and-push.sh            │
    └────────────────────────────────┘

┌─────────────────────────────────────┐
│     Production Server               │
│  prod.example.com                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Nginx (SSL/TLS)            │   │
│  │  port 80/443                │   │
│  └──────────────┬──────────────┘   │
│                 │                   │
│   ┌─────────────┴──────────────┐   │
│   │                            │    │
│   ▼                            ▼    │
│ ┌──────────┐              ┌────────┐│
│ │ Frontend │              │ Gateway││
│ │ (5173)   │              │ (4000) ││
│ └──────────┘              └────┬───┘│
│                                │    │
│          ┌──────────┬──────────┴──┐ │
│          │          │             │  │
│      ┌───▼──┐ ┌────▼───┐ ┌──────▼─┐│
│      │.NET  │ │ Java   │ │Database││
│      │Svc   │ │ Svc    │ │ (PG)   ││
│      └──────┘ └────────┘ └────────┘│
└─────────────────────────────────────┘
```

---

## Post-Deployment Operations

### Check Status

```bash
# SSH into server
ssh root@prod.example.com

# Check services
cd /opt/erp-system
docker compose ps

# View logs
docker compose logs -f gateway

# Check disk space
df -h
docker system df
```

### Scale Services

```bash
cd /opt/erp-system

# Restart a single service
docker compose restart gateway

# Restart all services
docker compose restart

# Stop all
docker compose down

# Start all
docker compose up -d
```

### Update Containers

```bash
cd /opt/erp-system

# Pull latest images
docker compose pull

# Restart with new images
docker compose restart

# Or full restart
docker compose down
docker compose up -d
```

### Manage SSL Certificates

```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/erp.example.com/fullchain.pem \
  -text -noout | grep "Not After"

# Renew certificate
certbot renew --standalone

# Restart nginx after renewal
docker compose restart nginx
```

---

## Security Checklist

✅ **Before Deployment:**
- [ ] Generate strong DB password (16+ chars with special chars)
- [ ] Store GitHub token securely (never commit to repo)
- [ ] Use SSH key authentication (no passwords)
- [ ] Verify SSH key permissions (chmod 600)
- [ ] Test SSH connectivity first
- [ ] Check firewall rules (allow 80, 443)
- [ ] Verify domain DNS records
- [ ] Use strong SSH key passphrases

✅ **After Deployment:**
- [ ] Verify HTTPS is working (https://erp.example.com)
- [ ] Check HTTP→HTTPS redirect
- [ ] Monitor service logs for errors
- [ ] Set up log rotation
- [ ] Configure automated backups
- [ ] Set up monitoring/alerting
- [ ] Test database backups
- [ ] Document access procedures
- [ ] Set up rate limiting
- [ ] Enable audit logging

---

## Troubleshooting

### Build Script Issues

```bash
# Error: "Docker is not installed"
curl -fsSL https://get.docker.com | sudo sh

# Error: "Failed to authenticate with GHCR"
# - Check token has write:packages scope
# - Verify token hasn't expired
# - Test manually: echo "token" | docker login ghcr.io -u username --password-stdin

# Error: "Services failed to build"
# Check Dockerfile exists: ls apps/*/Dockerfile
# Check syntax: docker build --help
```

### Deployment Script Issues

```bash
# Error: "Cannot connect to server via SSH"
ssh-keyscan -H prod.example.com >> ~/.ssh/known_hosts
ssh -i ~/.ssh/id_rsa root@prod.example.com "echo test"

# Error: "Services not starting"
ssh root@prod.example.com "cd /opt/erp-system && docker compose logs"

# Error: "SSL certificate issues"
ssh root@prod.example.com "ls -la /etc/letsencrypt/live/"
```

---

## GitHub Actions Setup

### Add Secrets to Repository

Go to: GitHub > Settings > Secrets and variables > Actions

Add these secrets:
```
DEPLOY_SERVER          = prod.example.com
DEPLOY_DOMAIN          = erp.example.com
DEPLOY_USERNAME        = root
DEPLOY_SSH_KEY         = (your private SSH key)
DEPLOY_EMAIL           = admin@example.com
DB_PASSWORD            = your_secure_password
```

### Trigger Deployments

```bash
# Automatic: Push a tag
git tag v1.0.0
git push origin v1.0.0

# Manual: Use GitHub Actions UI
# Go to Actions > Deploy > Run workflow > Enter version
```

---

## Files Summary

```
scripts/
├── build-and-push.sh           # Build and push to GHCR
├── deploy-production.sh        # Deploy to production
├── docker-compose.production.yml # Production compose config
├── config.example.json         # Configuration template
├── README.md                   # Scripts reference
├── start-local.sh             # Local development startup
├── stop-local.sh              # Local shutdown
└── quick-test.sh              # Validation tests

.github/workflows/
└── deploy.yml                 # GitHub Actions CI/CD

docs/
└── DEPLOYMENT_GUIDE.md        # Comprehensive deployment guide
```

---

## Next Steps

1. **Get GitHub Token**
   - Visit https://github.com/settings/tokens
   - Create token with `write:packages` scope
   - Save it securely

2. **Prepare Production Server**
   - Run container-host-setup.sh script
   - Ensure SSH key-based access works
   - Open ports 80 and 443

3. **Test Build Script**
   ```bash
   ./scripts/build-and-push.sh --dry-run --username JCTRoth
   ```

4. **Test Deployment Script**
   ```bash
   ./scripts/deploy-production.sh --server prod.example.com --dry-run
   ```

5. **Build Images** (first time)
   ```bash
   ./scripts/build-and-push.sh --username JCTRoth --token ghp_xxx --version 1.0.0
   ```

6. **Deploy to Production**
   ```bash
   ./scripts/deploy-production.sh --server prod.example.com --domain erp.example.com
   ```

7. **Verify Deployment**
   - Open https://erp.example.com
   - Check service status
   - Monitor logs

---

## Support & Documentation

- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Scripts Reference**: `scripts/README.md`
- **Architecture**: `docs/ARCHITECTURE_DECISION_BRAND_CATEGORY.md`
- **GitHub Actions**: `.github/workflows/deploy.yml`

---

## Questions & Customization

The scripts are designed to be:
- ✅ Flexible (CLI args, config files, interactive)
- ✅ Safe (dry-run mode, validation, error handling)
- ✅ Secure (token-based auth, SSH keys only)
- ✅ Transparent (detailed output, no hidden operations)

Feel free to customize the scripts to match your specific needs!
