# Step-by-Step Deployment Guide

## Current Situation

Your previous deployment to `95.111.254.120:4444` had these issues:
- ❌ Environment variables not passed to docker-compose
- ❌ Image pull failed with invalid reference `//erp-gateway:`
- ❌ SSH command execution errors
- ❌ Directory creation failures

**All issues are now FIXED** ✅

---

## Prerequisites

Before starting, verify these prerequisites:

### 1. SSH Key Setup
```bash
# Check if SSH key exists
ls -la ~/.ssh/id_rsa

# If not found, generate one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# Fix permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### 2. Verify SSH Access
```bash
ssh -p 4444 containeruser@95.111.254.120 "echo 'SSH Connection Successful'"
```

Expected output:
```
SSH Connection Successful
```

If this fails, troubleshoot:
- Check if server is running: `ping 95.111.254.120`
- Check if port 4444 is correct
- Verify SSH key is authorized on server

### 3. Verify GHCR Token
Your token: `REDACTED_GITHUB_TOKEN`

Verify it has access:
```bash
echo "REDACTED_GITHUB_TOKEN" | docker login ghcr.io -u jctroth --password-stdin
```

Expected output:
```
Login Succeeded
```

### 4. Verify Domain DNS (Optional)
If using Let's Encrypt with domain name:
```bash
nslookup shopping-now.net
# Should resolve to 95.111.254.120
```

---

## Deployment Steps

### Step 1: Navigate to Project Directory

```bash
cd /home/jonas/Git/ERP_System
```

Verify you're in the right directory:
```bash
ls -la scripts/deployment/deploy-to-server.sh
```

Expected output: File exists and is executable

### Step 2: Run Deployment with Dry-Run (Recommended First)

This will show ALL commands that will be executed without actually making changes:

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --email jonasroth@mailbase.info \
  --dry-run
```

This will output:
```
═══════════════════════════════════════════════════════════════
  Deployment Configuration Summary
═══════════════════════════════════════════════════════════════

Server:              95.111.254.120
Domain:              shopping-now.net
SSH Username:        containeruser
Registry:            ghcr.io
Image Version:       latest
Dry Run:             true

⚠ WARNING: DRY RUN MODE - No actual changes will be made to the server
```

Followed by all the commands that WOULD be executed. **Review these carefully**.

**Common dry-run output to expect:**
```
▶ Preparing remote server directories...
⚠ WARNING: DRY RUN: Would execute on remote server
⚠ WARNING: Command: mkdir -p /opt/erp-system/nginx/conf.d && mkdir -p /var/www/certbot

▶ Creating environment configuration...
⚠ WARNING: DRY RUN: Would copy /tmp/erp-deploy-*./.env.production to 95.111.254.120:/opt/erp-system/.env

ℹ Starting services...
⚠ WARNING: DRY RUN: Would execute on remote server
⚠ WARNING: Command: cd /opt/erp-system && echo 'ghp_*' | docker login ghcr.io -u JCTRoth --password-stdin && docker compose --env-file .env pull && docker compose --env-file .env up -d && sleep 10
```

### Step 3: Review Dry-Run Output

Make sure you see:
- ✓ Server and domain are correct
- ✓ SSH username is `containeruser`
- ✓ Registry is `ghcr.io`
- ✓ All file uploads are shown
- ✓ docker-compose commands use `--env-file .env`

### Step 4: Run Actual Deployment

Once you're satisfied with the dry-run output, **remove the `--dry-run` flag**:

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --email jonasroth@mailbase.info
```

**This will:**
1. Validate SSH connection (5s)
2. Setup server infrastructure (Docker, Nginx, etc.) (2-5m)
3. Create environment file with all variables
4. Upload docker-compose.yml and nginx config
5. Setup Let's Encrypt SSL certificate
6. Login to GHCR and pull all images (3-5m)
7. Start all services (1-2m)
8. Verify deployment is working

**Total time: ~10-15 minutes**

---

## Monitoring Deployment Progress

### While Deployment is Running

Open another terminal and monitor the remote server:

```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f'
```

This will show live logs from all services. Press `Ctrl+C` to stop monitoring.

---

## After Successful Deployment

### Verify Application is Running

1. **Check service status:**
   ```bash
   ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose ps'
   ```

   Expected output:
   ```
   NAME                      STATUS
   erp-postgres              Up 1 minute (healthy)
   erp-user-service          Up 1 minute
   erp-gateway               Up 1 minute
   erp-frontend              Up 1 minute
   ... other services ...
   ```

2. **Access the application:**
   ```
   https://shopping-now.net
   ```

3. **Check SSL certificate:**
   ```bash
   ssh -p 4444 containeruser@95.111.254.120 'openssl x509 -in /etc/letsencrypt/live/shopping-now.net/fullchain.pem -text -noout | grep -A2 "Subject:"'
   ```

### View Environment Variables on Server

Verify the `.env` file was created correctly:

```bash
ssh -p 4444 containeruser@95.111.254.120 'cat /opt/erp-system/.env'
```

Expected output:
```
DB_PASSWORD=COMPUTER
REGISTRY_URL=ghcr.io
REGISTRY_USERNAME=JCTRoth
IMAGE_VERSION=latest
DEPLOY_DOMAIN=shopping-now.net
```

---

## Troubleshooting

### Issue: SSH Connection Refused

**Error:**
```
ssh: connect to host 95.111.254.120 port 4444: Connection refused
```

**Solutions:**
1. Verify server is online: `ping 95.111.254.120`
2. Verify SSH port is 4444: `ssh -p 4444 containeruser@95.111.254.120`
3. Check SSH key exists: `ls ~/.ssh/id_rsa`
4. Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`

### Issue: GHCR Token Invalid

**Error:**
```
Error response from daemon: invalid reference format
unable to get image '//erp-gateway:'
```

**Solution:**
```bash
# Test token
echo "REDACTED_GITHUB_TOKEN" | docker login ghcr.io -u jctroth --password-stdin

# If login fails, token is invalid or expired
# Generate new token at: https://github.com/settings/tokens
```

### Issue: Services Won't Start

**Check logs:**
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs --tail=50'
```

**Common causes:**
- Low disk space: `ssh -p 4444 containeruser@95.111.254.120 'df -h'`
- Port already in use: `ssh -p 4444 containeruser@95.111.254.120 'netstat -tuln | grep LISTEN'`
- Database initialization failed: `ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs postgres'`

### Issue: Let's Encrypt Certificate Fails

**Error in deployment output:**
```
Certbot error: (...) Could not bind to port 80
```

**Solutions:**
1. Ensure port 80 is open: `curl http://95.111.254.120` (from outside)
2. Ensure port 443 is open: `curl -k https://95.111.254.120` (from outside)
3. Check domain resolves: `nslookup shopping-now.net`
4. Manually create certificate after deployment:
   ```bash
   ssh -p 4444 containeruser@95.111.254.120 'sudo certbot certonly --standalone -d shopping-now.net --email jonasroth@mailbase.info'
   ```

---

## Common Commands After Deployment

### View Live Logs
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f'
```

### View Specific Service Logs
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f gateway'
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f user-service'
```

### Stop All Services
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose down'
```

### Start All Services
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose up -d'
```

### Restart All Services
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose restart'
```

### Restart Specific Service
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose restart gateway'
```

### Pull Latest Images
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose --env-file .env pull'
```

### Recreate Containers (after pulling new images)
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose --env-file .env up -d'
```

---

## One-Command Quick Reference

### Dry-Run (Safe to test)
```bash
cd /home/jonas/Git/ERP_System && bash scripts/deployment/deploy-to-server.sh --server 95.111.254.120 --port 4444 --username containeruser --domain shopping-now.net --registry-token REDACTED_GITHUB_TOKEN --db-password COMPUTER --email jonasroth@mailbase.info --dry-run
```

### Deploy (Actual deployment - no --dry-run)
```bash
cd /home/jonas/Git/ERP_System && bash scripts/deployment/deploy-to-server.sh --server 95.111.254.120 --port 4444 --username containeruser --domain shopping-now.net --registry-token REDACTED_GITHUB_TOKEN --db-password COMPUTER --email jonasroth@mailbase.info
```

### View Live Logs
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f'
```

---

## Success Checklist

- [ ] SSH connection works
- [ ] Dry-run shows correct commands
- [ ] Deployment completes without errors
- [ ] `https://shopping-now.net` is accessible
- [ ] SSL certificate is valid
- [ ] All services are running: `docker compose ps`
- [ ] Environment variables are set: `cat /opt/erp-system/.env`

---

## Next Steps After Deployment

1. **Verify application functionality**
   - Test user login
   - Test API endpoints
   - Check database connectivity

2. **Monitor for issues**
   - Watch logs for 5-10 minutes after startup
   - Check CPU/memory usage
   - Verify all services maintain "Up" status

3. **Configure backups** (optional)
   - Set up PostgreSQL backups
   - Configure log rotation
   - Plan disaster recovery

4. **Document configuration**
   - Save deployment command
   - Document any custom settings
   - Keep SSH key secure

---

## Need Help?

Review these documents:
- `DEPLOYMENT_FIXED.md` - Comprehensive guide
- `DEPLOYMENT_FIXES_SUMMARY.md` - What was fixed and why
- `QUICK_DEPLOY.md` - Quick reference

Or check logs:
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs --tail=100'
```

