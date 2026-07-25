# Deploy ERP System to k3s

The ERP System runs on the k3s cluster at `erp.shopping-now.net`.

## Architecture

```
Browser ──► k3s Server (port 80/443)
              └── Traefik (built-in, kube-system)
                    │ reads Ingress from namespace "erp"
                    │ terminates TLS (cert-manager + Let's Encrypt)
                    ▼
                  Ingress: host=erp.shopping-now.net
                    ├── /          → erp-frontend:3000    (React SPA incl. /graphql proxy)
                    ├── /graphql   → erp-gateway:4000     (Apollo Federation)
                    └── /shop      → erp-webshop:3008     (public webshop)
                           │
                           └──► 13 backend services (ClusterIP, namespace: erp)
                                  ├── erp-postgres (StatefulSet, port 5432)
                                  ├── 5× .NET 8 services
                                  ├── 4× Java 21 services
                                  ├── 1× Node.js templates service
                                  ├── erp-gateway (Apollo federation)
                                  ├── erp-frontend (nginx + React)
                                  ├── erp-webshop (nginx + React)
                                  └── erp-minio (object storage)
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with buildx plugin
- [kubectl](https://kubernetes.io/docs/tasks/tools/) with the k3s kubeconfig at `~/.kube/k3s-erp.yaml`
- Logged into `ghcr.io` — GitHub PAT with `read:packages` + `write:packages` scopes:

  ```bash
  echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
  ```

- A DNS A record for `erp.shopping-now.net` pointing to the k3s server IP (or a wildcard `*.shopping-now.net`)

## Quick Start

### 1. Configure credentials

```bash
cp .env.k3s.example .env.k3s
```

Edit `.env.k3s` and set your `GITHUB_TOKEN`.

### 2. Deploy everything

```bash
# Build all images, push to GHCR, deploy to k3s
bash scripts/k3s-deploy-erp.sh
```

### One-command variants

```bash
# Deploy without rebuilding images (use existing registry images)
bash scripts/k3s-deploy-erp.sh --skip-build

# Deploy a specific tag
bash scripts/k3s-deploy-erp.sh --tag v1.2.3

# Dry-run — see what would happen
bash scripts/k3s-deploy-erp.sh --dry-run

# Show deployment status
bash scripts/k3s-deploy-erp.sh --status

# Build & push only (no deploy)
bash scripts/k3s-build-push-erp.sh --tag latest
```

## Checking Status

```bash
# Full status
bash scripts/k3s-deploy-erp.sh --status

# Or manually:
KUBECONFIG=~/.kube/k3s-erp.yaml kubectl get pods,ingress,svc,certificate -n erp -o wide
```

The app will be available at:
- **ERP**: `https://erp.shopping-now.net`
- **Webshop**: `https://erp.shopping-now.net/shop`

TLS certificate provisioning may take 2–5 minutes on the first deploy.

## Service List

| Service | Port | Technology | Database |
|---------|------|------------|----------|
| erp-frontend | 3000 | nginx + React 18 | — |
| erp-webshop | 3008 | nginx + React 18 | — |
| erp-gateway | 4000 | Node.js Apollo | — |
| erp-user-service | 5000 | .NET 8 | userdb |
| erp-shop-service | 5003 | .NET 8 | shopdb |
| erp-accounting-service | 5001 | .NET 8 | accountingdb |
| erp-masterdata-service | 5002 | .NET 8 | masterdatadb |
| erp-orders-service | 5004 | .NET 8 | ordersdb |
| erp-company-service | 8080 | Java 21 | companydb |
| erp-translation-service | 8081 | Java 21 | translationdb |
| erp-notification-service | 8082 | Java 21 | notificationdb |
| erp-scripting-service | 8083 | Java 21 | scriptingdb |
| erp-templates-service | 8087 | Node.js | templatesdb |
| erp-minio | 9000,9001 | MinIO | — (PVC) |
| erp-postgres | 5432 | PostgreSQL 16 | — (PVC) |

## Resource Requirements

All services combined (estimated):
- **CPU**: ~3 cores (requests) / ~8 cores (limits)
- **RAM**: ~2.5 GB (requests) / ~7 GB (limits)
- **Disk**: 10 Gi (PostgreSQL + MinIO PVCs)

These are generous limits — actual usage is lower. Adjust `requests`/`limits` in the k8s manifests if needed.

## Updating

After making code changes:

```bash
# Rebuild all images, push, and redeploy
bash scripts/k3s-deploy-erp.sh --tag latest

# Or skip unchanged services
bash scripts/k3s-deploy-erp.sh --skip "scripting-service,orders-service"
```

## Troubleshooting

### `ImagePullBackOff`

```bash
kubectl describe pod -n erp | grep -A5 "Failed"
kubectl get secret ghcr-secret -n erp

# Check: GHCR_TOKEN has read:packages scope
# Check: image name matches (case-sensitive)
```

### `CrashLoopBackOff`

```bash
kubectl logs -n erp deployment/erp-gateway --tail=50
# Check: PostgreSQL is ready before backend services start
```

### Certificate stuck in `Pending`

```bash
kubectl describe certificaterequest -n erp
kubectl logs -n cert-manager deployment/cert-manager --tail=50

# Common: DNS A record doesn't point to k3s server IP
# Common: Traefik not reachable on port 80 from internet
# Tip: use letsencrypt-staging for testing (edit ingress annotation)
```

### Database initialization failed

```bash
kubectl logs -n erp statefulset/erp-postgres
# The init script runs on first container start — check for errors
```

### Cannot connect to cluster

```bash
KUBECONFIG=~/.kube/k3s-erp.yaml kubectl cluster-info
# If stale, get a fresh kubeconfig from the k3s server admin
```

## Files Reference

| File | Purpose |
|------|---------|
| `k8s/00-namespace.yaml` | Creates the `erp` namespace |
| `k8s/01-secrets.yaml` | Database, JWT, MinIO, SMTP secrets |
| `k8s/10-postgres.yaml` | PostgreSQL StatefulSet + Service + PVC |
| `k8s/11-postgres-init-configmap.yaml` | DB init script (creates users + databases) |
| `k8s/20-dotnet-services.yaml` | 5 .NET services (User, Shop, Accounting, Masterdata, Orders) |
| `k8s/30-java-services.yaml` | 4 Java services (Company, Translation, Notification, Scripting) |
| `k8s/40-templates-service.yaml` | Node.js Templates service |
| `k8s/50-gateway.yaml` | Apollo Gateway |
| `k8s/60-frontend.yaml` | React Frontend (nginx + k8s ConfigMap) |
| `k8s/70-webshop.yaml` | React Webshop |
| `k8s/75-minio.yaml` | MinIO object storage |
| `k8s/80-ingress.yaml` | Traefik Ingress with TLS |
| `scripts/k3s-build-push-erp.sh` | Build & push all 13 images |
| `scripts/k3s-deploy-erp.sh` | One-command deploy |
| `.env.k3s.example` | Credentials template |

## Running Side-by-Side with Other Projects

The k3s cluster supports multiple projects via Kubernetes namespaces. Each
project gets its own namespace, isolated from others while sharing the
cluster's Traefik and cert-manager.

Your ERP system runs in the `erp` namespace. Other projects (e.g. Daniel's
apps) run in their own namespaces. Traefik reads Ingress resources from all
namespaces and routes by hostname — no conflicts.

```bash
# See all namespaces on the cluster
kubectl get namespaces

# See all ingresses across all namespaces
kubectl get ingress --all-namespaces
```
