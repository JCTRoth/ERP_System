# ERP System Docker Compose Files - Resolution

## Files Found

### Active Files ✅
1. **docker-compose.yml** (11.2KB, Jan 11 10:29) - **PRIMARY PRODUCTION FILE**
   - Uses GHCR images (`ghcr.io/jctroth/erp-*:latest`)
   - Optimized for production deployment
   - All services defined with resource limits
   - Comment: Nginx reverse proxy is commented out (uses system nginx)

2. **docker-compose.dev.yml** (9.1KB, Jan 10 02:36) - **PRIMARY DEVELOPMENT FILE**
   - Uses local build contexts
   - Hot-reload enabled via Dockerfile.dev
   - Volume mounts for source code
   - Includes monitoring stack (Prometheus, Grafana, MinIO)
   - Used by: `./scripts/start-local.sh`

### Obsolete/Duplicate Files ❌
1. **docker-compose.deploy.yml** (9.8KB, Jan 11 00:25) - **OUTDATED DUPLICATE**
   - Older version of docker-compose.yml
   - Minor differences in config (missing ASPNETCORE_URLS, frontend port)
   - **NOT REFERENCED** anywhere in codebase
   - **ACTION**: Should be deleted - it's an abandoned version

2. **docker-compose.override.yml** - **DELETED** ✓
   - Was using Docker Compose profiles (not fully implemented)
   - Not referenced in any scripts
   - Successfully removed

---

## Key Differences Between Active Files

| Aspect | docker-compose.yml | docker-compose.dev.yml |
|--------|-------------------|---------------------|
| **Image Source** | GHCR Registry | Local Build |
| **Environment** | Production | Development |
| **Frontend Port** | 3000:80 (nginx) | 5173:5173 (dev server) |
| **Database Port** | Not exposed | 15432:5432 |
| **Volumes** | Only postgres-data | Many source code mounts |
| **Monitoring** | Commented out | Included (Prometheus, Grafana) |
| **Storage** | Not included | MinIO included |
| **Startup Speed** | Fast (pre-built) | Slow (builds) |

---

## Recommendations

### Immediate Action
```bash
# Delete the outdated deployment compose file
rm docker-compose.deploy.yml
```

### Documentation Update
Update README or deployment docs to clarify:
- **Development**: Use `docker-compose.dev.yml`
- **Production**: Use `docker-compose.yml`
- No other compose files are active

### Future Improvements
1. Consider renaming for clarity:
   - `docker-compose.yml` → `docker-compose.production.yml`
   - Create separate `docker-compose.yml` that auto-selects based on environment

2. Add environment-specific files:
   - `.env.development`
   - `.env.production`
   - `.env.example`

3. Consolidate redundant configs

---

## Verification

To verify which compose file is being used:
```bash
# Development (local)
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml config > compose-check.yml
# Verify images are from ghcr.io
```

