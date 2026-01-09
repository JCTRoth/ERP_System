# ERP System Deployment Guide

## Overview

This guide explains how to build, push, and deploy the ERP System to a production server.

The deployment process consists of two main steps:

1. **Build & Push** - Build all containers on your development machine and push to GitHub Container Registry (GHCR)
2. **Deploy to Production** - Deploy the application on a production server with SSL/HTTPS

## Prerequisites

### Local Development Machine
- Docker (with buildx support recommended)
- Docker Compose
- bash 4+
- jq (for JSON config file parsing)
- GitHub Personal Access Token (PAT) with `write:packages` scope

### Production Server
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed (use the container-host-setup.sh script)
- SSH access with key-based authentication
- Open ports: 80 (HTTP), 443 (HTTPS)
- At least 4GB RAM and 20GB storage

## Step 1: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" (classic)
3. Set scopes:
   - `write:packages` - Push container images
   - `read:packages` - Pull container images (optional, for internal use)
4. Copy the token and keep it safe

## Step 2: Build and Push to GHCR

### Option A: Interactive Mode

```bash
./scripts/deployment/deploy-to-registry.sh
```

The script will prompt for:
- GitHub username (default: JCTRoth)
- GitHub Personal Access Token
- Image version tag (default: latest)

### Option B: Using Command Line Arguments

```bash
./scripts/deployment/deploy-to-registry.sh \
  --username JCTRoth \
  --token ghp_your_token_here \
  --version 1.0.0
```

### Option C: Using Configuration File

Create a file named `build-config.json`:

```json
{
  "github_username": "JCTRoth",
  "github_token": "ghp_your_token_here",
  "registry_url": "ghcr.io",
  "image_version": "1.0.0",
  "parallel_builds": 2
}
```

Then run:

```bash
./scripts/deployment/deploy-to-registry.sh --config build-config.json
```

### Dry Run (Preview Only)

To see what would be built without actually building:

```bash
./scripts/deployment/deploy-to-registry.sh --dry-run --username JCTRoth --version 1.0.0
```

### Parallel Builds

Control the number of parallel builds:

```bash
./scripts/deployment/deploy-to-registry.sh --parallel 4 --username JCTRoth --token ghp_xxx
```

## Step 3: Deploy to Production

### Option A: Interactive Mode

```bash
./scripts/deployment/deploy-to-server.sh
```

The script will prompt for:
- Production server hostname/IP
- Domain name for SSL certificate
- Email for Let's Encrypt notifications
- GitHub Container Registry token
- PostgreSQL password

### Option B: Using Command Line Arguments

```bash
./scripts/deployment/deploy-to-server.sh \
  --server prod.example.com \
  --domain erp.example.com \
  --email admin@example.com \
  --registry-user JCTRoth \
  --registry-token ghp_your_token_here \
  --db-password MySecurePassword123
```

### Option C: Using Configuration File

Create a file named `deploy-config.json`:

```json
{
  "deploy_server": "192.168.1.100",
  "deploy_domain": "erp.example.com",
  "deploy_username": "root",
  "deploy_ssh_key": "~/.ssh/id_rsa",
  "registry_url": "ghcr.io",
  "registry_username": "JCTRoth",
  "registry_token": "ghp_your_token_here",
  "image_version": "1.0.0",
  "letsencrypt_email": "admin@example.com",
  "db_password": "MySecurePassword123"
}
```

Then run:

```bash
./scripts/deployment/deploy-to-server.sh --config deploy-config.json
```

### Dry Run (Preview Only)

To see what would be deployed without actually deploying:

```bash
./scripts/deployment/deploy-to-server.sh \
  --server prod.example.com \
  --domain erp.example.com \
  --dry-run
```

## Step 4: Verify Deployment

After deployment, the script will automatically verify:

1. ✅ HTTP to HTTPS redirect is working
2. ✅ HTTPS connectivity is established
3. ✅ All services are running

## Post-Deployment Management

### Access the Application

Open your browser and navigate to: `https://erp.example.com`

### View Logs

SSH into the server and check logs:

```bash
ssh root@prod.example.com
cd /opt/erp-system
docker compose logs -f gateway       # View gateway logs
docker compose logs -f frontend      # View frontend logs
```

### Restart Services

```bash
cd /opt/erp-system
docker compose restart               # Restart all services
docker compose restart gateway       # Restart specific service
```

### Stop Services

```bash
cd /opt/erp-system
docker compose down
```

### Start Services Again

```bash
cd /opt/erp-system
docker compose pull                  # Pull latest images
docker compose up -d                 # Start all services
```

## SSL Certificate Management

The deployment script automatically sets up Let's Encrypt SSL certificates. Certificates are valid for 90 days.

### Check Certificate Expiration

```bash
ssh root@prod.example.com
openssl x509 -in /etc/letsencrypt/live/erp.example.com/fullchain.pem -text -noout | grep -A1 "Not After"
```

### Renew Certificate Manually

```bash
ssh root@prod.example.com
certbot renew --standalone
docker compose restart nginx
```

## Environment Variables Reference

### Build Script Variables
- `GITHUB_USERNAME` - GitHub username for GHCR
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `REGISTRY_URL` - Container registry URL (default: ghcr.io)
- `IMAGE_VERSION` - Image version tag (default: latest)

### Deploy Script Variables
- `DEPLOY_SERVER` - Production server hostname/IP
- `DEPLOY_DOMAIN` - Domain name for SSL
- `DEPLOY_USERNAME` - SSH username (default: root)
- `DEPLOY_SSH_KEY` - Path to SSH private key
- `REGISTRY_USERNAME` - GitHub username for pulling images
- `REGISTRY_TOKEN` - GitHub PAT for pulling images
- `IMAGE_VERSION` - Image version to deploy

## CI/CD Integration (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Push Images
        run: |
          ./scripts/deployment/deploy-to-registry.sh \
            --username JCTRoth \
            --token ${{ secrets.GITHUB_TOKEN }} \
            --version ${{ github.ref_name }}
  
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          
          ./scripts/deploy-to-server.sh \
            --server ${{ secrets.DEPLOY_SERVER }} \
            --domain ${{ secrets.DEPLOY_DOMAIN }} \
            --email ${{ secrets.DEPLOY_EMAIL }} \
            --registry-token ${{ secrets.GITHUB_TOKEN }} \
            --db-password ${{ secrets.DB_PASSWORD }} \
            --image-version ${{ github.ref_name }}
```

Required GitHub Secrets:
- `GITHUB_TOKEN` - Auto-created by GitHub (has write:packages scope in Actions)
- `DEPLOY_SERVER` - Production server hostname
- `DEPLOY_DOMAIN` - Domain name
- `DEPLOY_EMAIL` - Email for Let's Encrypt
- `DEPLOY_SSH_KEY` - SSH private key (base64 encoded or raw)
- `DB_PASSWORD` - PostgreSQL password

## Troubleshooting

### Build Script Issues

**Problem**: "Docker is not installed"
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Problem**: "Failed to authenticate with GHCR"
- Verify your GitHub token has `write:packages` scope
- Ensure the token hasn't expired
- Check your GitHub username is correct

### Deployment Script Issues

**Problem**: "Cannot connect to server via SSH"
- Verify server is reachable: `ping prod.example.com`
- Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
- Verify SSH key is the correct one: `ssh-keygen -l -f ~/.ssh/id_rsa`
- Check firewall allows SSH (port 22)

**Problem**: "Services not starting after deployment"
```bash
# Check service logs
ssh root@prod.example.com
cd /opt/erp-system
docker compose logs

# Check disk space
docker system df

# Restart services
docker compose restart
```

**Problem**: "SSL certificate not working"
- Check certificate exists: `/etc/letsencrypt/live/erp.example.com/`
- Verify DNS points to server
- Check nginx configuration in `/opt/erp-system/nginx/conf.d/default.conf`
- Restart nginx: `docker compose restart nginx`

## Security Best Practices

1. **Use strong database passwords** - At least 16 characters with mixed case and special characters
2. **Protect your GitHub token** - Never commit it to version control
3. **Use SSH keys** - Don't use password authentication
4. **Restrict SSH access** - Use a firewall to limit SSH access
5. **Keep containers updated** - Regularly rebuild and redeploy with latest images
6. **Monitor logs** - Set up log aggregation and alerting
7. **Regular backups** - Backup the PostgreSQL database regularly

## Network Architecture

```
┌─────────────────────────────────────────┐
│         Internet / Client                │
└─────────────────┬───────────────────────┘
                  │ HTTPS (443)
                  │ HTTP (80)
      ┌───────────▼──────────┐
      │   Nginx (Reverse     │
      │   Proxy + SSL)       │
      └───────────┬──────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ┌───▼────┐          ┌──▼──────┐
    │Frontend│          │  Gateway│
    │(5173)  │          │  (4000) │
    └────────┘          └──┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼─────┐    ┌──────▼────┐    ┌───────▼──┐
    │Services │    │ Services  │    │ Database │
    │(.NET)   │    │ (Java)    │    │ (PG)     │
    │5000-    │    │ 8080-     │    │ 5432     │
    │5004     │    │ 8087      │    │          │
    └─────────┘    └───────────┘    └──────────┘
```

## Support

For issues, check:
1. Deployment script logs
2. Service logs on the server
3. Firewall and network connectivity
4. SSL certificate expiration
5. Disk space and system resources

Run diagnostics:

```bash
ssh root@prod.example.com
cd /opt/erp-system

# Check services status
docker compose ps

# Check logs for errors
docker compose logs --tail=100

# Check disk usage
df -h

# Check Docker disk usage
docker system df
```
