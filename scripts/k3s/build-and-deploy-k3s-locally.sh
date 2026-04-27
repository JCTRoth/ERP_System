#!/usr/bin/env bash
# Build all ERP System container images and deploy them to the local K3s cluster.
#
# Usage: ./scripts/build-and-deploy-k3s.sh [--no-cache]
#
# Steps performed:
#   1. Build all Docker images via build-all-containers.sh
#   2. Export images from Docker and import into K3s containerd
#   3. Ensure namespace + secrets exist
#   4. Deploy / upgrade via Helm
#   5. Set up kubectl port-forwards (frontend :3000, gateway :4000)
#   6. Show cluster status
#
# Run from the repository root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NAMESPACE="erp"
RELEASE_NAME="erp-system"
HELM_CHART="./infrastructure/helm/erp-system"
HELM_VALUES="./infrastructure/helm/erp-system/values.yaml"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "\n${GREEN}==>${NC} $*"; }

# ── Parse flags ───────────────────────────────────────────────────────────────
NO_CACHE=""
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE="--no-cache" ;;
        *) log_error "Unknown argument: $arg"; exit 1 ;;
    esac
done

# ── Prerequisite check ────────────────────────────────────────────────────────
check_requirements() {
    log_step "Checking prerequisites..."
    for cmd in docker kubectl helm k3s; do
        if ! command -v "$cmd" &>/dev/null; then
            log_error "'$cmd' not found. Please install it before running this script."
            exit 1
        fi
    done
    if ! kubectl get nodes &>/dev/null; then
        log_error "Cannot reach K3s cluster. Ensure ~/.kube/config is configured:"
        log_error "  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown \$USER:\$USER ~/.kube/config"
        exit 1
    fi
    log_info "✓ All prerequisites satisfied"
}

# ── Step 1: Build images ──────────────────────────────────────────────────────
build_images() {
    log_step "Step 1/5 – Building Docker images..."
    bash "$PROJECT_ROOT/scripts/build/build-all-containers.sh" $NO_CACHE
}

# ── Step 2: Import into K3s containerd ───────────────────────────────────────
import_images() {
    log_step "Step 2/5 – Importing images into K3s containerd..."

    local tmp_dir
    tmp_dir="$(mktemp -d)"
    trap "rm -rf $tmp_dir" EXIT

    log_info "Saving images to tar archive (this may take a minute)..."
    docker save \
        erp/frontend:latest erp/gateway:latest \
        erp/user-service:latest erp/shop-service:latest \
        erp/accounting-service:latest erp/masterdata-service:latest erp/orders-service:latest \
        erp/company-service:latest erp/translation-service:latest \
        erp/notification-service:latest erp/scripting-service:latest \
        erp/edifact-service:latest erp/templates-service:latest \
        > "$tmp_dir/all.tar"

    log_info "Importing into K3s containerd (requires sudo)..."
    sudo k3s ctr images import "$tmp_dir/all.tar"

    log_info "✓ All images imported"
}

# ── Step 3: Namespace + secrets ───────────────────────────────────────────────
ensure_namespace_and_secrets() {
    log_step "Step 3/5 – Ensuring namespace and secrets..."

    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    if ! kubectl get secret erp-system-secrets -n "$NAMESPACE" &>/dev/null; then
        log_info "Creating secrets..."
        kubectl create secret generic erp-system-secrets \
            --namespace="$NAMESPACE" \
            --from-literal=postgres-password='postgres' \
            --from-literal=jwt-secret='your-super-secret-256bit-key-for-hs256-algorithm' \
            --dry-run=client -o yaml | kubectl apply -f -
    fi

    log_info "✓ Namespace and secrets ready"
}

# ── Step 4: Helm deploy ───────────────────────────────────────────────────────
deploy_helm() {
    log_step "Step 4/5 – Deploying via Helm..."

    cd "$PROJECT_ROOT"
    helm upgrade --install "$RELEASE_NAME" "$HELM_CHART" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --values "$HELM_VALUES" \
        --set environment=development \
        --wait \
        --timeout 5m

    log_info "✓ Helm deployment complete"
}

# ── Step 5: Port-forwards ─────────────────────────────────────────────────────
setup_portforwards() {
    log_step "Step 5/5 – Setting up port-forwards..."

    pkill -f "kubectl port-forward" 2>/dev/null || true
    sleep 1

    nohup kubectl port-forward svc/erp-system-frontend 3000:3000 -n "$NAMESPACE" \
        > /tmp/erp-frontend-pf.log 2>&1 &
    nohup kubectl port-forward svc/erp-system-gateway  4000:4000 -n "$NAMESPACE" \
        > /tmp/erp-gateway-pf.log  2>&1 &

    sleep 2
    log_info "✓ Port-forwards started"
}

# ── Summary ───────────────────────────────────────────────────────────────────
show_status() {
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  ERP System deployed successfully${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo "  Frontend:  http://localhost:3000"
    echo "  Gateway:   http://localhost:4000/graphql"
    echo ""
    echo "  kubectl get pods -n $NAMESPACE"
    echo ""
    kubectl get pods -n "$NAMESPACE" 2>/dev/null || true
}

# ── Entry point ───────────────────────────────────────────────────────────────
main() {
    check_requirements
    build_images
    import_images
    ensure_namespace_and_secrets
    deploy_helm
    setup_portforwards
    show_status
}

main
