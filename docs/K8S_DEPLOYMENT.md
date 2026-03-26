# Local Kubernetes Deployment Guide (k3s/k3d)

This guide explains how to run the ERP System on local Kubernetes for development.

## Prerequisites

- **Kubernetes cluster** (k3s, k3d, kind, or minikube)
- **kubectl** configured and pointing to your cluster
- **Helm 3.x** installed
- **Docker** installed and running
- **4GB+ RAM available** for cluster

## Quick Start (First Time)

### 1. Create k3s/k3d cluster (if you don't have one)

```bash
# Using k3d (easiest)
k3d cluster create erp

# Or using k3s locally
k3s server --datastore-endpoint=sqlite:///etc/rancher/k3s/db.sqlite3
```

### 2. Deploy everything automatically

```bash
bash scripts/k8s-local-deploy.sh full
```

This will:
- Build all 14 Docker images (frontend, gateway, all microservices)
- Load images into k3s containerd
- Create namespace and secrets
- Deploy Helm chart with PostgreSQL
- Initialize databases
- Setup port-forwards

**Total time: 5-10 minutes**

### 3. Access the system

**Frontend (React):**
```
http://localhost:3000
```

**GraphQL Gateway (when ready):**
```
http://localhost:4000/graphql
```

**Monitor services:**
```bash
kubectl get pods -n erp-dev --watch
```

---

## After PC Restart

### Option A: Quick Restart (Rebuild + Redeploy)

```bash
bash scripts/k8s-local-deploy.sh rebuild
```

This rebuilds Docker images and reapplies the Helm chart. Takes ~2-3 minutes.

### Option B: Just Restart Port-Forwards

If cluster is already running:

```bash
bash scripts/k8s-local-deploy.sh portforward
```

---

## Available Commands

```bash
# Full setup (build, deploy, everything)
bash scripts/k8s-local-deploy.sh full

# Rebuild images and redeploy (quick restart after code changes)
bash scripts/k8s-local-deploy.sh rebuild

# Deploy/upgrade Helm chart only (images must exist)
bash scripts/k8s-local-deploy.sh deploy

# Setup port-forwards for existing services
bash scripts/k8s-local-deploy.sh portforward

# Show cluster status
bash scripts/k8s-local-deploy.sh status

# Remove all resources from cluster (cleanup)
bash scripts/k8s-local-deploy.sh clean
```

---

## Stopping the System

### Stop Port-Forwards Only (Services Keep Running)

```bash
bash scripts/k8s-local-stop.sh stop
```

Services and databases keep running, just closes local access ports. Database data preserved.

### Pause Deployment (Stop Helm Release)

```bash
bash scripts/k8s-local-stop.sh pause
```

Stops all pods and Helm release, but keeps PostgreSQL data intact. Useful for saving resources before a long break.

**Resume with:** `bash scripts/k8s-local-deploy.sh deploy`

### Full Cleanup (Remove Everything)

```bash
bash scripts/k8s-local-stop.sh clean
```

Removes all resources, namespaces, and PostgreSQL data. Requires confirmation. Use when you want a complete reset.

**Redeploy after:** `bash scripts/k8s-local-deploy.sh full`

### Check Status

```bash
bash scripts/k8s-local-stop.sh status
```

Shows port-forwards, running pods, and PostgreSQL volumes.

---

## Available Commands

---

## What Gets Persisted

After deployment:

✅ **Persists across PC restart:**
- PostgreSQL data (PVC volumes)
- Helm release configuration
- k3s/k3d cluster state (via local volumes)
- All service configurations

❌ **Does NOT persist automatically:**
- Docker images in k3s (rebuild needed if cluster reset)
- Port-forwards (need manual restart or use script)

---

## What's Been Automated

The `k8s-local-deploy.sh` script handles:

1. ✅ Checking prerequisites (kubectl, helm, docker)
2. ✅ Creating namespace and secrets
3. ✅ **Building all 14 microservices** from source
4. ✅ **Loading images into k3s containerd**
5. ✅ **Deploying Helm chart** with correct values
6. ✅ **Creating PostgreSQL** and databases
7. ✅ **Initializing schemas** via init job
8. ✅ **Starting all services** in correct order
9. ✅ **Setting up port-forwards** for local access

**You never need to do these manually again!**

---

## Microservices Being Deployed

### Frontend
- **Technology:** React 18 + TypeScript + Vite
- **Port:** 3000 (nginx)
- **Status:** ✓ Running

### API Gateway
- **Technology:** Node.js + Apollo GraphQL Federation
- **Port:** 4000
- **Status:** Initializing (probes microservices)

### .NET Services (6 total)
- **user-service** (5000)
- **shop-service** (5003)
- **accounting-service** (5001)
- **masterdata-service** (5002)
- **orders-service** (5004)
- **Status:** ✓ Connecting to PostgreSQL

### Java Services (5 total)
- **company-service** (8080)
- **translation-service** (8081)
- **notification-service** (8082)
- **scripting-service** (8083)
- **edifact-service** (8084)
- **Status:** ✓ Connecting to PostgreSQL

### Supporting Services
- **templates-service** (8087, Node.js) - AsciiDoc document generation
- **PostgreSQL** (5432) - Shared database
- **Prometheus/Grafana** - Monitoring

---

## Monitoring

### Check Pod Status

```bash
# Watch pods in real-time
kubectl get pods -n erp-dev --watch

# Check specific service
kubectl describe pod erp-system-frontend-xxx -n erp-dev

# View logs
kubectl logs erp-system-user-service-xxx -n erp-dev
```

### Access Grafana

```bash
kubectl port-forward svc/erp-system-grafana 3001:80 -n erp-dev
# Visit http://localhost:3001
# Default credentials: admin / prom-operator
```

---

## Troubleshooting

### Port Already in Use

If port 3000/4000 is already in use:

```bash
# Kill existing port-forwards
pkill kubectl

# Or use different ports
kubectl port-forward svc/erp-system-frontend 8000:3000 -n erp-dev
```

### Pods Still in CrashLoopBackOff

Check logs and events:

```bash
# See why pod is crashing
kubectl logs POD_NAME -n erp-dev

# Get full pod details
kubectl describe pod POD_NAME -n erp-dev

# Check namespace events
kubectl get events -n erp-dev --sort-by='.lastTimestamp'
```

### PostgreSQL Not Ready

```bash
# Check database pod
kubectl get pod -l app.kubernetes.io/component=postgresql -n erp-dev

# Check init job
kubectl get job -n erp-dev
kubectl logs erp-system-postgres-init-* -n erp-dev
```

### Clean and Start Over

```bash
bash scripts/k8s-local-deploy.sh clean
bash scripts/k8s-local-deploy.sh full
```

---

## Configuration

### Changing Database Credentials

Edit `infrastructure/helm/erp-system/values.yaml`:

```yaml
postgresql:
  user: postgres
  database: postgres

# Secrets are in kubernetes secret, update with:
kubectl edit secret erp-system-secrets -n erp-dev
```

### Adjusting Resource Limits

Edit `infrastructure/helm/erp-system/values.yaml` under each service:

```yaml
services:
  frontend:
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

---

## Files Modified/Created

- ✅ `scripts/k8s-local-deploy.sh` - Main deployment automation
- ✅ `scripts/k8s-quick-restart.sh` - Quick restart helper
- ✅ `docs/K8S_DEPLOYMENT.md` - This guide
- ✅ `infrastructure/helm/erp-system/` - Existing Helm chart (no changes needed)

**The Helm chart and Dockerfiles already have everything configured correctly!**

---

## Next Steps

1. Run `bash scripts/k8s-local-deploy.sh full` for full setup
2. Wait 5-10 minutes for all services to initialize
3. Access frontend at `http://localhost:3000`
4. Monitor with `kubectl get pods -n erp-dev --watch`

For PC restarts, just run `bash scripts/k8s-local-deploy.sh rebuild` to rebuild and redeploy!
