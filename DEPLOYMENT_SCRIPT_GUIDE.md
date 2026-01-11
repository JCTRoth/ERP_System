# Deploy-to-Server Script Integration Guide

## Quick Start

The `deploy-to-server.sh` script has been enhanced to automatically set up server infrastructure using `container-host-setup.sh` before deploying the ERP system.

### Basic Usage

```bash
cd /home/jonas/Git/ERP_System

# Dry-run test (recommended first step)
./scripts/deployment/deploy-to-server.sh \
  --server localhost \
  --domain localhost \
  --username jonas \
  --registry-token YOUR_GITHUB_TOKEN \
  --db-password YOUR_DB_PASSWORD \
  --email your@email.com \
  --dry-run

# Actual deployment
./scripts/deployment/deploy-to-server.sh \
  --server your-server.com \
  --domain your-app.com \
  --username admin \
  --registry-token YOUR_GITHUB_TOKEN \
  --db-password YOUR_DB_PASSWORD \
  --email your@email.com
```

## What Gets Set Up

### Phase 1: Server Infrastructure (via container-host-setup.sh)

The script automatically:

1. **System Preparation**
   - Update package cache
   - Install essential packages (htop, curl, wget, etc.)
   - Configure unattended security updates

2. **Container Runtime** (Choose one)
   - **k3s**: Lightweight Kubernetes with containerd
   - **Docker Swarm**: Docker CE with Swarm mode
   
   *Note: The script auto-selects based on system resources*

3. **Security Hardening**
   - SSH key-based authentication only
   - Direct root login disabled
   - Fail2Ban for intrusion prevention
   - SSHGuard for brute-force protection
   - UFW firewall with minimal open ports

4. **Administration**
   - Creates `containeruser` admin account
   - Configures passwordless sudo with SSH keys
   - Sets up recovery admin user (optional)
   - Grants non-root docker access

5. **Additional Services**
   - Nginx for reverse proxy
   - Certbot for Let's Encrypt SSL
   - Custom port configuration
   - Service health monitoring

### Phase 2: Application Deployment

1. **Create Production Environment**
   - Generate docker-compose.yml with all services
   - Configure service dependencies
   - Set up health checks

2. **Configure Reverse Proxy**
   - Nginx configuration for HTTP→HTTPS redirect
   - Backend service routing
   - SSL termination

3. **Deploy Services**
   - Login to GitHub Container Registry
   - Pull pre-built images
   - Start all 11 microservices
   - Verify service health

4. **SSL Certificate Setup**
   - Obtain Let's Encrypt certificate
   - Configure automatic renewal
   - Enable HTTPS enforcement

## Configuration Options

### Command-Line Arguments

```bash
--server HOST              Production server hostname/IP
--domain DOMAIN            Domain name for SSL certificate
--username USER            SSH username (default: root)
--port PORT                SSH port (default: 22)
--ssh-key PATH             Path to SSH private key
--registry-url URL         Container registry URL (default: ghcr.io)
--registry-user USER       GitHub username (default: JCTRoth)
--registry-token TOKEN     GitHub PAT for pulling images
--image-version TAG        Image version to deploy (default: latest)
--email EMAIL              Email for Let's Encrypt notifications
--db-password PASS         PostgreSQL password
--config FILE              Path to config JSON file
--dry-run                  Show deployment plan without executing
--help                     Show this help message
```

### Configuration File (JSON)

Create `deployment-config.json`:

```json
{
  "deploy_server": "your-server.com",
  "deploy_domain": "your-app.com",
  "deploy_username": "admin",
  "deploy_ssh_key": "/home/user/.ssh/id_rsa",
  "deploy_port": 22,
  "registry_url": "ghcr.io",
  "registry_username": "JCTRoth",
  "registry_token": "YOUR_GITHUB_TOKEN",
  "image_version": "latest",
  "letsencrypt_email": "your@email.com",
  "db_password": "YOUR_SECURE_PASSWORD"
}
```

Then deploy:

```bash
./scripts/deployment/deploy-to-server.sh --config deployment-config.json
```

## Deployment Stages

### 1. Validation
- ✓ SSH connectivity check
- ✓ Configuration validation
- ✓ Required fields verification

### 2. Infrastructure Setup
- ✓ Download `container-host-setup.sh` to server
- ✓ Execute automated server setup
- ✓ Install Docker/k3s
- ✓ Configure firewall and security
- ✓ Create admin user
- ✓ Harden SSH

### 3. Application Deployment
- ✓ Create docker-compose.production.yml
- ✓ Generate Nginx reverse proxy config
- ✓ Login to container registry
- ✓ Pull service images
- ✓ Start services
- ✓ Wait for service initialization

### 4. SSL Setup
- ✓ Install Certbot
- ✓ Request Let's Encrypt certificate
- ✓ Configure automatic renewal
- ✓ Enable HTTPS

### 5. Verification
- ✓ Check HTTP→HTTPS redirect
- ✓ Verify HTTPS connectivity
- ✓ Confirm all services are running
- ✓ Display deployment summary

## Key Features

### Automated Admin User

The script creates a non-root admin user (`containeruser`) with:

- **SSH Key Authentication**: No password-based login
- **Sudo Access**: Full administrative privileges when needed
- **Docker Access**: Non-root container management
- **Security Model**: Follows principle of least privilege

Connect as admin:
```bash
ssh -p 22 containeruser@your-server.com

# Elevate to root for administrative tasks
sudo -i
```

### Firewall Configuration

The UFW firewall is automatically configured to allow:

- SSH (port 22 by default, customizable)
- HTTP (port 80)
- HTTPS (port 443)
- k3s API (port 6443)
- Container services on internal bridge network

All inbound traffic is blocked by default.

### Security Best Practices

1. **SSH Hardening**
   - Only public key authentication
   - No direct root login
   - Configurable port
   - SSH Guard enabled

2. **Intrusion Prevention**
   - Fail2Ban with custom jail rules
   - SSHGuard for brute-force blocking
   - UFW firewall with minimum open ports
   - Automatic security updates

3. **Service Management**
   - Non-root container access
   - Health checks configured
   - Restart policies
   - Resource limits

4. **SSL/TLS**
   - Let's Encrypt certificates
   - Automatic renewal
   - HTTP→HTTPS redirect
   - HSTS headers

## Common Scenarios

### Scenario 1: Fresh Server Deployment

```bash
# On fresh Ubuntu 20.04+ server (bare metal)
./scripts/deployment/deploy-to-server.sh \
  --server new-server.example.com \
  --domain app.example.com \
  --username admin \
  --registry-token YOUR_TOKEN \
  --db-password YOUR_PASSWORD \
  --email admin@example.com
```

What happens:
1. SSH to server and verify connectivity
2. Upload and run `container-host-setup.sh`
3. Install Docker (or k3s) with all security hardening
4. Create admin user with SSH key auth
5. Deploy ERP system containers
6. Set up Let's Encrypt SSL
7. Verify everything is working

### Scenario 2: Existing Server with Docker

If your server already has Docker installed, the script:
- Skips Docker installation
- Still configures firewall
- Still sets up Let's Encrypt
- Still deploys application

### Scenario 3: Dry-Run Testing

```bash
./scripts/deployment/deploy-to-server.sh \
  --server localhost \
  --domain localhost \
  --dry-run
```

This shows exactly what would happen without making any changes. Useful for:
- Testing configuration
- Verifying commands
- Planning deployment steps
- Training

## Monitoring & Maintenance

After deployment, monitor your system:

### View Service Logs
```bash
ssh containeruser@your-server.com

# Docker compose logs
cd /opt/erp-system
docker compose logs -f gateway

# System logs
journalctl -u docker -f
```

### Manage Services
```bash
# View running services
docker compose ps

# Restart a service
docker compose restart user-service

# Stop all services
docker compose down

# View resource usage
docker stats

# Check disk usage
df -h
```

### Monitor Security
```bash
# Check active jails
sudo fail2ban-client status

# View banned IPs
sudo fail2ban-client status sshd

# Check firewall rules
sudo ufw status verbose

# View SSH login attempts
sudo journalctl -u ssh -f
```

### Automatic Updates
The server automatically applies security updates via `unattended-upgrades`. Check:

```bash
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log
```

## Troubleshooting

### SSH Connection Failed

```bash
# Verify server is reachable
ping your-server.com

# Test SSH connectivity with verbose output
ssh -v -i ~/.ssh/id_rsa -p 22 admin@your-server.com

# Verify SSH key is readable
chmod 600 ~/.ssh/id_rsa

# Check SSH key fingerprint
ssh-keygen -l -f ~/.ssh/id_rsa
```

### Services Not Starting

```bash
ssh containeruser@your-server.com

# Check service status
docker compose ps -a

# View service logs
docker compose logs user-service

# Verify network connectivity
docker network ls

# Check resource availability
docker stats
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# View certificate details
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout

# Test certificate renewal (dry-run)
sudo certbot renew --dry-run
```

### Firewall Blocking Services

```bash
# Check firewall status
sudo ufw status verbose

# Allow a specific port (if needed)
sudo ufw allow PORT/tcp

# Reload firewall
sudo ufw reload

# Check open ports
sudo ss -tuln
```

## Advanced Configuration

### Custom SSH Port

Modify `container-host-setup.sh` parameters in `setup_server_infrastructure()`:

```bash
# In deploy-to-server.sh, modify:
sudo bash /tmp/container-host-setup.sh \
  --yes \
  --admin-user containeruser \
  --admin-password 'YourPassword' \
  --ssh-key "$ADMIN_SSH_KEY"
```

### Custom Orchestration

Edit the setup command to specify k3s or Docker Swarm:

```bash
# For k3s (Kubernetes)
# For Docker Swarm
# The script auto-selects based on available resources
```

### Environment Variables

Alternatively, set environment variables:

```bash
export DEPLOY_SERVER="your-server.com"
export DEPLOY_DOMAIN="your-app.com"
export DEPLOY_USERNAME="admin"
export REGISTRY_TOKEN="YOUR_TOKEN"
export DB_PASSWORD="YOUR_PASSWORD"

./scripts/deployment/deploy-to-server.sh
```

## Files Included

| File | Purpose | Size |
|------|---------|------|
| `deploy-to-server.sh` | Main deployment script | 840 lines |
| `container-host-setup.sh` | Server infrastructure setup | 3,481 lines |
| `deploy-to-registry.sh` | Build and push images | 330 lines |
| `interactive-deploy.sh` | User-friendly wrapper | 281 lines |

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  deploy-to-server.sh                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1: Infrastructure Setup                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  container-host-setup.sh (3,481 lines)                │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  • Docker/k3s Installation                            │ │
│  │  • SSH Hardening                                      │ │
│  │  • UFW Firewall                                       │ │
│  │  • Fail2Ban & SSHGuard                                │ │
│  │  • Admin User Setup                                   │ │
│  │  • Let's Encrypt Certbot                              │ │
│  │  • Unattended Updates                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│  Phase 2: Application Deployment                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Docker Compose Generation                          │ │
│  │  • Nginx Reverse Proxy Config                         │ │
│  │  • Image Registry Authentication                      │ │
│  │  • Service Startup & Health Checks                    │ │
│  │  • SSL Certificate Setup                              │ │
│  │  • Deployment Verification                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │  Result: Production-Ready ERP System                  │ │
│  │  • All 11 microservices running                       │ │
│  │  • Database initialized                               │ │
│  │  • HTTPS configured                                   │ │
│  │  • Security hardened                                  │ │
│  │  • Ready for business operations                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Support & Documentation

For more information:
- [Deployment Analysis](./DEPLOYMENT_ANALYSIS.md)
- [Architecture Decision Docs](./docs/DEPLOYMENT_GUIDE.md)
- [Backend Documentation](./docs/BACKEND.adoc)
- [Frontend Documentation](./docs/FRONTEND.adoc)

## Next Steps

1. **Prepare SSH Keys**
   ```bash
   # Generate SSH key if needed
   ssh-keygen -t ed25519 -f ~/.ssh/id_rsa -N ""
   ```

2. **Get GitHub Token**
   - Visit https://github.com/settings/tokens
   - Create Personal Access Token with `read:packages` scope
   - Save token securely

3. **Choose Server**
   - Fresh Ubuntu 20.04+ LTS recommended
   - Minimum 2GB RAM, 20GB disk
   - SSH access required

4. **Run Dry-Run**
   ```bash
   ./scripts/deployment/deploy-to-server.sh \
     --server test-server.com \
     --domain test-app.com \
     --registry-token YOUR_TOKEN \
     --db-password YOUR_PASSWORD \
     --email admin@example.com \
     --dry-run
   ```

5. **Deploy**
   ```bash
   # Same command without --dry-run
   ./scripts/deployment/deploy-to-server.sh \
     --server your-server.com \
     --domain your-app.com \
     --registry-token YOUR_TOKEN \
     --db-password YOUR_PASSWORD \
     --email admin@example.com
   ```

## Success Indicators

After deployment completes, you should see:

- ✅ All services running: `docker compose ps`
- ✅ HTTPS working: Access your domain in browser
- ✅ Admin user created: `containeruser`
- ✅ Firewall active: `sudo ufw status`
- ✅ SSL certificate valid: Padlock in browser
- ✅ All databases initialized: PostgreSQL running
- ✅ GraphQL Gateway responding: `curl https://your-domain/graphql`

Congratulations! Your ERP system is now production-ready! 🎉
