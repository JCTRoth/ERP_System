# scripts/k3s — Kubernetes / K3s Deployment

Scripts for deploying and managing the ERP System on a local K3s (or compatible) Kubernetes cluster.

## Scripts

| Script | Purpose |
|---|---|
| `k3s-local-deploy.sh` | Full lifecycle: build images, import into K3s, deploy via Helm, set up port-forwards |
| `k3s-local-stop.sh` | Stop port-forwards, pause deployment, or full cleanup |
| `k3s-quick-restart.sh` | Quick rebuild and redeploy after a PC restart (assumes cluster already exists) |
| `build-and-deploy-k3s-locally.sh` | Build all images and import them into K3s containerd |

## Usage

Run from the **repository root**:

```bash
# Full deployment (first time or clean slate)
./scripts/k3s/k3s-local-deploy.sh full

# After PC restart (cluster running, just redeploy)
./scripts/k3s/k3s-quick-restart.sh

# Stop port-forwards only
./scripts/k3s/k3s-local-stop.sh stop

# Stop and pause (preserve data)
./scripts/k3s/k3s-local-stop.sh pause

# Full teardown (deletes all data)
./scripts/k3s/k3s-local-stop.sh clean

# Build images and import into K3s (without Helm deploy)
./scripts/k3s/build-and-deploy-k3s-locally.sh
```

## Prerequisites

- K3s (or k3d / kind / minikube) installed and running
- `kubectl` configured
- `helm` 3.x installed
- Docker installed
- 4 GB+ RAM available

## Access

After deployment, services are port-forwarded:
- Frontend: `http://localhost:3000`
- Apollo Gateway: `http://localhost:4000/graphql`
