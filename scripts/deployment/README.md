# Interactive Docker Deployment

This folder contains scripts for building and deploying ERP system containers to the GitHub Container Registry.

## Available Scripts

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

### Docker not found
Ensure Docker is installed and running:
```bash
docker --version
docker ps
```

### Authentication failed
- Verify your GitHub token has the `write:packages` scope
- Check your GitHub username is correct
- Generate a new token if needed

### Build failures
- Check individual service Dockerfiles
- Ensure all dependencies are available
- Check disk space and network connectivity

### Permission denied
Make sure the script is executable:
```bash
chmod +x interactive-deploy.sh
```
