# Quick Deploy Reference - shopping-now.net

## One-Line Deploy Command

```bash
cd /home/jonas/Git/ERP_System && bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --email jonasroth@mailbase.info
```

## Deploy with Dry-Run First (Recommended)

```bash
cd /home/jonas/Git/ERP_System && bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --email jonasroth@mailbase.info \
  --dry-run
```

## Verify SSH Access First

```bash
ssh -i ~/.ssh/id_rsa -p 4444 containeruser@95.111.254.120 "echo 'SSH OK'"
```

## Common Post-Deploy Commands

### View live logs
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f'
```

### Check service status
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose ps'
```

### View gateway logs only
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs -f gateway'
```

### Stop services
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose down'
```

### Restart services
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose restart'
```

### View remote environment
```bash
ssh -p 4444 containeruser@95.111.254.120 'cat /opt/erp-system/.env'
```

## What Was Fixed

| Issue | Fix |
|-------|-----|
| Missing env variables | Created `.env` file on server |
| SSH command errors | Simplified command construction |
| Directory not found | Pre-create directories before copy |
| Image pull failures | Proper variable substitution |

## File Locations on Server

After deployment, these exist:
- `/opt/erp-system/.env` - Environment variables
- `/opt/erp-system/docker-compose.yml` - Service definitions
- `/opt/erp-system/nginx/conf.d/default.conf` - Nginx config
- `/etc/letsencrypt/live/shopping-now.net/` - SSL certificates

## Expected Timeline

- SSH validation: 5s
- Server setup: 2-5m
- Image pull: 3-5m
- Service startup: 1-2m
- Verification: 10s
- **Total: ~10-15 minutes**

## Before First Run

1. ✓ SSH key configured: `chmod 600 ~/.ssh/id_rsa`
2. ✓ Test SSH access works
3. ✓ GHCR token is valid
4. ✓ Domain DNS points to 95.111.254.120 (for SSL)
5. ✓ Port 80 & 443 open for Let's Encrypt

## If Something Goes Wrong

### Check the logs immediately
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose logs --tail=50'
```

### View docker compose version on server
```bash
ssh -p 4444 containeruser@95.111.254.120 'docker compose version'
```

### Manually restart with env file
```bash
ssh -p 4444 containeruser@95.111.254.120 'cd /opt/erp-system && docker compose --env-file .env pull && docker compose --env-file .env up -d'
```

## Application Access

- **URL**: https://shopping-now.net
- **GraphQL**: https://shopping-now.net/graphql

