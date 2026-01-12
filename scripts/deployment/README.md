# Interactive Docker Deployment

This folder contains scripts for building and deploying ERP system containers to the GitHub Container Registry.

## Available Scripts

### `start-prod-local.sh`

A comprehensive script that simulates production deployment on your local machine using `docker-compose.prod-local.yml`.

**Features:**
- Builds all service images locally (production-ready)
- Starts services in correct dependency order
- Comprehensive health checks and verification
- Production-like configuration with proper logging
- Multiple command modes (start, stop, status, logs, cleanup)

**Usage:**
```bash
cd scripts/deployment
./start-prod-local.sh [command]
```

**Commands:**
- `start` - Start production simulation (default)
- `stop` - Stop all services
- `status` - Show current status and access URLs
- `restart` - Restart all services
- `logs [service]` - Show logs (optionally for specific service)
- `cleanup` - Stop services and remove containers/volumes/images

## Production Simulation

The `start-prod-local.sh` script provides a complete local production environment simulation:

### What it does:
1. **Pre-flight checks** - Validates Docker and compose files
2. **Builds images** - Creates production-ready container images locally
3. **Network checks** - Ensures required ports are available
4. **Infrastructure** - Starts PostgreSQL with proper configuration
5. **Services** - Launches all microservices in dependency order (MinIO is optional)
6. **Frontend** - Starts the React application
7. **Gateway** - Starts Apollo Gateway last (takes longest to initialize)
8. **Verification** - Tests all endpoints and provides access information

### Notes:
- **MinIO (file storage)** is optional for local development. If it fails to start, the system will continue without file storage features
- All core ERP functionality (users, companies, orders, etc.) works without MinIO
- For full file storage capabilities, ensure MinIO starts successfully

### Access URLs (when running):
- **Frontend:** http://localhost:8088 (production build served by nginx)
- **GraphQL Gateway:** http://localhost:4000/graphql
- **Health Check:** http://localhost:4000/health
- **Metrics:** http://localhost:4000/metrics
- **PostgreSQL:** localhost:15432 (user: postgres, pass: postgres)

### Example usage:
```bash
# Start production simulation
./start-prod-local.sh start

# Check status
./start-prod-local.sh status

# View gateway logs
./start-prod-local.sh logs gateway

# Stop everything
./start-prod-local.sh stop

# Complete cleanup (removes images too)
./start-prod-local.sh cleanup
```

### `interactive-deploy.sh`

An interactive script that guides you through the deployment process with step-by-step prompts.

**Features:**
- Interactive input collection for all required parameters
- Clear progress indicators with color-coded output
- Dry-run mode for testing
- Comprehensive error handling
- Detailed deployment summary

**Usage:**
```bash
cd scripts/deployment
./interactive-deploy.sh
```

## How It Works

1. **Collects Inputs:**
   - GitHub Username (default: JCTRoth)
   - GitHub Personal Access Token (required, with write:packages scope)
   - Image Version Tag (e.g., 1.1)
   - Dry Run Option (y/N)

2. **Validates Environment:**
   - Checks Docker installation
   - Authenticates with GitHub Container Registry

3. **Builds and Pushes Services:**
   - frontend
   - gateway
   - user-service
   - shop-service
   - accounting-service
   - masterdata-service
   - orders-service
   - company-service
   - translation-service
   - notification-service
   - scripting-service

4. **Provides Summary:**
   - Shows success/failure count
   - Lists any failed services

## Requirements

### For Production Simulation (`start-prod-local.sh`):
- Docker installed and running
- Docker Compose V2
- At least 8GB RAM available
- At least 10GB free disk space
- Ports 15432, 4000, 5173, 5000-5004, 8080-8082, 8087 available

### For Registry Deployment (`interactive-deploy.sh`):
- Docker installed and running
- GitHub Personal Access Token with `write:packages` scope
- Internet connection for pushing to GHCR

## Security Notes

- The script prompts for your GitHub token securely (no echo)
- Tokens are never stored or logged
- Always use tokens with minimal required permissions
- Revoke tokens after use if they're no longer needed

## Example Session

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ERP System Docker Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[i] This script will build and push ERP containers to GitHub Container Registry

GitHub Username [JCTRoth]: JCTRoth
GitHub Personal Access Token (with write:packages scope): 
Image Version Tag (e.g., 1.1): 1.1
Run in dry-run mode? (y/N): n

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Deployment Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Registry URL:       ghcr.io
GitHub Username:    JCTRoth
Image Version:      1.1
Total Services:     11
Dry Run Mode:       false

Continue with deployment? (Y/n): Y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Building and Pushing Services
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[i] Building: frontend
[✓] Built: frontend
[i] Pushing: frontend
[✓] Pushed: frontend to ghcr.io

[i] Building: gateway
[✓] Built: gateway
[i] Pushing: gateway
[✓] Pushed: gateway to ghcr.io

... (continues for all services)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Deployment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Successfully built and pushed: 11/11 services
[✓] All services built and pushed successfully!
```

## Troubleshooting

### Production Simulation Issues

### Port conflicts
The script checks for required ports. If ports are in use:
```bash
# Find what's using a port
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### Build failures
- Ensure you have enough disk space
- Check Docker has enough memory allocated
- Try building individual services:
```bash
docker compose -f docker-compose.prod-local.yml build frontend
```

### Services not starting
- Check logs: `./start-prod-local.sh logs [service-name]`
- Ensure PostgreSQL is healthy before services start
- Wait longer for gateway initialization (can take 2-3 minutes)

### Out of memory
- Increase Docker memory allocation in Docker Desktop
- Close other applications
- Use `./start-prod-local.sh stop` to clean up

### Docker not found
Ensure Docker is installed and running:
```bash
docker --version
docker ps
```

### Authentication failed (for registry deployment)
- Verify your GitHub token has the `write:packages` scope
- Check your GitHub username is correct
- Generate a new token if needed

### Permission denied
Make sure scripts are executable:
```bash
chmod +x start-prod-local.sh interactive-deploy.sh
```
