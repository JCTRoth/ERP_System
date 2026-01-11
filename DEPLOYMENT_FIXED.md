# ERP System Deployment - Fixed Version

## Recent Fixes

The deployment script has been updated to fix critical issues encountered during the initial production run:

### Issues Fixed

1. **Missing Environment Variables** ✓
   - Problem: Docker compose complained about unset `DB_PASSWORD`, `REGISTRY_URL`, etc.
   - Solution: Created a `.env` file on the remote server with all required variables
   - Docker compose now loads from `--env-file .env`

2. **SSH Command Execution** ✓
   - Problem: `bash: -c: option requires an argument` errors
   - Solution: Simplified SSH command construction to avoid problematic multi-line bash -c
   - Commands are now single-line for reliability

3. **Remote Directory Creation** ✓
   - Problem: `mkdir: missing operand` and files couldn't be uploaded
   - Solution: Pre-create all required directories before copying files
   - Now creates `/opt/erp-system/nginx/conf.d` and `/var/www/certbot` upfront

4. **Nginx Config Upload** ✓
   - Problem: `scp: No such file or directory` when destination didn't exist
   - Solution: Directories created in deploy_application() before SCP operations

## How to Deploy

### Prerequisites

Ensure on your local machine:
- SSH key is set up: `~/.ssh/id_rsa` or custom path via `--ssh-key`
- SSH access to `containeruser@95.111.254.120:4444` works
- GHCR token with read permissions for images

### Step 1: Verify SSH Access

```bash
ssh -i ~/.ssh/id_rsa -p 4444 containeruser@95.111.254.120 "echo 'SSH access OK'"
```

Expected output: `SSH access OK`

### Step 2: Run Deployment with Dry-Run (Recommended First)

```bash
cd /home/jonas/Git/ERP_System

bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token YOUR_GHCR_TOKEN \
  --db-password YOUR_DB_PASSWORD \
  --email your-email@example.com \
  --dry-run
```

This will show exactly what commands will be executed without making any changes.

### Step 3: Run Actual Deployment

Once satisfied with the dry-run output, remove `--dry-run`:

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token YOUR_GHCR_TOKEN \
  --db-password YOUR_DB_PASSWORD \
  --email your-email@example.com
```

### Expected Output

The script will:
1. Validate SSH connection
2. Set up server infrastructure (Docker, firewall, etc.) via container-host-setup.sh
3. Create environment configuration file (`.env`)
4. Upload docker-compose.yml with all service definitions
5. Upload nginx configuration
6. Set up Let's Encrypt SSL certificate
7. Login to GHCR and pull all images
8. Start all services with `docker compose up -d`
9. Verify deployment and display service status

### Step 4: Monitor After Deployment

```bash
# View live logs
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f'

# Check service status
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose ps'

# View specific service logs (e.g., gateway)
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f gateway'
```

## Environment Variables

The script now properly sets these on the remote server via `.env` file:

| Variable | Source | Purpose |
|----------|--------|---------|
| `DB_PASSWORD` | `--db-password` arg | PostgreSQL admin password |
| `REGISTRY_URL` | Defaults to `ghcr.io` | Container registry URL |
| `REGISTRY_USERNAME` | Defaults to `JCTRoth` | Registry username |
| `IMAGE_VERSION` | Defaults to `latest` | Image version tag to deploy |
| `DEPLOY_DOMAIN` | `--domain` arg | Domain for SSL certificate |

## Key Files Created on Remote Server

After deployment, these files exist on `/opt/erp-system/`:

```
/opt/erp-system/
├── .env                        # Environment variables
├── docker-compose.yml          # Service definitions
├── postgres-init/
│   └── init-multi-db.sh        # Database initialization
└── nginx/
    └── conf.d/
        └── default.conf        # Nginx configuration
```

## Troubleshooting

### Issue: SSH Connection Refused

```bash
ssh -p 4444 containeruser@95.111.254.120
```

If this fails:
- Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
- Verify port is correct (4444)
- Check if server is online: `ping 95.111.254.120`

### Issue: Docker Login Fails

Error: `Error response from daemon: invalid reference format`

Solution: Ensure `REGISTRY_TOKEN` is valid and account has GHCR permissions

### Issue: Services Won't Start

Check logs:
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs'
```

Common causes:
- Insufficient disk space
- Port already in use
- Database connection issues

### Issue: SSL Certificate Setup Fails

The script attempts to use Let's Encrypt standalone mode. For this to work:
- Port 80 must be open to the internet
- Domain must be publicly accessible
- Email must be valid

If Let's Encrypt fails, manually set up:
```bash
ssh -p 4444 containeruser@95.111.254.120 'sudo certbot certonly --standalone -d shopping-now.net'
```

## Command Reference

### Full Option List

```bash
bash scripts/deployment/deploy-to-server.sh [OPTIONS]

OPTIONS:
  --server HOST              Production server hostname/IP
  --port PORT                SSH port (default: 22)
  --username USER            SSH username (default: root)
  --domain DOMAIN            Domain name for SSL
  --registry-token TOKEN     GHCR authentication token
  --db-password PASSWORD     PostgreSQL password
  --email EMAIL              Let's Encrypt email
  --registry-url URL         Registry URL (default: ghcr.io)
  --registry-user USER       Registry username (default: JCTRoth)
  --image-version VERSION    Image tag (default: latest)
  --ssh-key PATH             SSH private key path
  --dry-run                  Preview without executing
  --config FILE              Load from JSON config file
  --help                     Show help
```

### Config File Format (JSON)

```json
{
  "deploy_server": "95.111.254.120",
  "deploy_port": 4444,
  "deploy_domain": "shopping-now.net",
  "deploy_username": "containeruser",
  "registry_url": "ghcr.io",
  "registry_username": "JCTRoth",
  "registry_token": "your_token_here",
  "image_version": "latest",
  "db_password": "your_password",
  "letsencrypt_email": "your@email.com"
}
```

Then deploy with:
```bash
bash scripts/deployment/deploy-to-server.sh --config deployment-config.json
```

## Post-Deployment

### Access the Application

```
https://shopping-now.net
```

### Manage Services

```bash
# Stop all services
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose down'

# Restart services
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose restart'

# Restart specific service
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose restart gateway'

# View SSL certificate info
ssh -p 4444 containeruser@95.111.254.120 'openssl x509 -in /etc/letsencrypt/live/shopping-now.net/fullchain.pem -text -noout'
```

## Advanced Usage

### Custom SSH Key

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token YOUR_TOKEN \
  --db-password YOUR_PASSWORD \
  --email your@email.com \
  --ssh-key /path/to/custom/key
```

### Custom Image Version

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token YOUR_TOKEN \
  --db-password YOUR_PASSWORD \
  --email your@email.com \
  --image-version v1.2.3
```

## Script Architecture

### Execution Flow

1. **Validation**
   - Check SSH connectivity
   - Verify required parameters

2. **Server Setup** (via container-host-setup.sh)
   - Install Docker & dependencies
   - Configure firewall (UFW)
   - Set up SSH hardening
   - Install Certbot

3. **Application Deploy**
   - Create `.env` with variables
   - Upload docker-compose.yml
   - Upload nginx config
   - Obtain SSL certificate
   - Pull images and start services

4. **Verification**
   - Check HTTP→HTTPS redirect
   - Verify HTTPS connectivity
   - Display service status

### Key Functions

- `ssh_exec()` - Execute commands on remote server
- `scp_to_server()` - Copy files to remote server
- `create_production_compose()` - Generate docker-compose.yml
- `create_nginx_config()` - Generate nginx configuration
- `setup_letsencrypt()` - Obtain SSL certificate
- `deploy_application()` - Main application deployment
- `verify_deployment()` - Post-deployment checks

## Security Notes

- SSH private key must have proper permissions: `chmod 600 ~/.ssh/id_rsa`
- Container registry token should have minimal required permissions
- Database password should be strong and unique
- Consider using SSH keys instead of password authentication
- Let's Encrypt email should be monitored for certificate expiration notices

