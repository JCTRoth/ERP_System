#!/usr/bin/env bash
# Local K3s deployment script for ERP System
# Builds images with Docker, imports into K3s containerd, deploys via Helm
# Usage: ./scripts/k3s-local-deploy.sh [action]
# Actions: full (default), rebuild, deploy, portforward, status, clean
# Requires: docker, kubectl (~/.kube/config pointing to K3s), helm, k3s (sudo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NAMESPACE="erp"
RELEASE_NAME="erp-system"
HELM_CHART="./infrastructure/helm/erp-system"
HELM_VALUES="./infrastructure/helm/erp-system/values.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "\n${GREEN}==>${NC} $*"; }

# Check prerequisites
check_requirements() {
    log_step "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. K3s installs it at /usr/local/bin/kubectl — ensure it is on PATH or run: sudo ln -sf /usr/local/bin/kubectl /usr/bin/kubectl"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        log_error "helm not found. Install with: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "docker not found. Install docker first (needed to build images)."
        exit 1
    fi

    if ! command -v k3s &> /dev/null; then
        log_error "k3s not found. Install with: curl -sfL https://get.k3s.io | sh -"
        exit 1
    fi

    # Verify KUBECONFIG points to K3s (must be readable by current user)
    if ! kubectl get nodes &>/dev/null; then
        log_error "Cannot reach K3s cluster. Ensure ~/.kube/config is set up:"
        log_error "  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown \$USER:\$USER ~/.kube/config"
        exit 1
    fi

    local k3s_ver
    k3s_ver=$(k3s --version | head -1)
    log_info "✓ kubectl: $(kubectl version --client --short 2>/dev/null || kubectl version --client -o json | jq -r '.clientVersion.gitVersion')"
    log_info "✓ K3s:     ${k3s_ver}"
    log_info "✓ Helm:    $(helm version --short)"
    log_info "✓ Docker:  $(docker version --format '{{.Client.Version}}' 2>/dev/null)"
    log_info "✓ Ingress class: traefik  |  Storage class: local-path"
}

# Ensure namespace exists
ensure_namespace() {
    log_step "Ensuring namespace exists..."
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - || true
    log_info "✓ Namespace $NAMESPACE ready"
}

# Create secrets if missing
ensure_secrets() {
    log_step "Ensuring secrets are created..."
    
    if ! kubectl get secret erp-system-secrets -n "$NAMESPACE" &> /dev/null; then
        log_info "Creating secrets..."
        kubectl create secret generic erp-system-secrets \
            --namespace="$NAMESPACE" \
            --from-literal=postgres-password='postgres' \
            --from-literal=jwt-secret='your-super-secret-256bit-key-for-hs256-algorithm' \
            --dry-run=client -o yaml | kubectl apply -f - || true
    fi
    
    log_info "✓ Secrets configured"
}

# Build Docker images
build_images() {
    log_step "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Frontend
    log_info "Building frontend..."
    docker build -f apps/frontend/Dockerfile -t erp/frontend:latest ./apps/frontend
    
    # Gateway
    log_info "Building gateway..."
    docker build -f apps/gateway/Dockerfile -t erp/gateway:latest ./apps/gateway
    
    # .NET Services
    log_info "Building .NET services..."
    cd apps/services
    docker build -f dotnet/UserService/Dockerfile -t erp/user-service:latest dotnet
    docker build -f dotnet/ShopService/Dockerfile -t erp/shop-service:latest dotnet
    docker build -f dotnet/AccountingService/Dockerfile -t erp/accounting-service:latest dotnet
    docker build -f dotnet/AccountingService/Dockerfile -t erp/accounting-service:1.4 dotnet
    docker build -f dotnet/MasterdataService/Dockerfile -t erp/masterdata-service:latest dotnet
    docker build -f dotnet/OrdersService/Dockerfile -t erp/orders-service:latest dotnet
    
    # Java Services
    log_info "Building Java services..."
    docker build -t erp/company-service:latest ./java/company-service
    docker build -t erp/translation-service:latest ./java/translation-service
    docker build -t erp/notification-service:latest ./java/notification-service
    docker build -t erp/scripting-service:latest ./java/scripting-service
    docker build -t erp/edifact-service:latest ./java/edifact-service
    
    # Node.js Templates Service
    log_info "Building templates service..."
    docker build -t erp/templates-service:latest ./nodejs/templates-service
    
    cd "$PROJECT_ROOT"
    log_info "✓ All images built successfully"
}

# Load images into K3s containerd via k3s ctr
load_images() {
    log_step "Loading images into K3s containerd..."

    # K3s uses containerd, not the Docker daemon.
    # We must export from Docker and import into K3s containerd.
    if ! command -v k3s &> /dev/null; then
        log_error "k3s not found. Is K3s installed?"
        exit 1
    fi

    log_info "Saving Docker images to tar archive..."
    mkdir -p /tmp/erp-images

    docker save erp/frontend:latest erp/gateway:latest \
        erp/user-service:latest erp/shop-service:latest \
        erp/accounting-service:latest \
        erp/masterdata-service:latest erp/orders-service:latest \
        erp/company-service:latest erp/translation-service:latest \
        erp/notification-service:latest erp/scripting-service:latest \
        erp/edifact-service:latest erp/templates-service:latest \
        > /tmp/erp-images/all.tar

    log_info "Importing images into K3s containerd (requires sudo)..."
    sudo k3s ctr images import /tmp/erp-images/all.tar
    rm -rf /tmp/erp-images

    log_info "✓ All images imported into K3s containerd"
}

# Deploy via Helm
deploy_helm() {
    log_step "Deploying ERP System with Helm..."
    
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

# Wait for key services
wait_for_services() {
    log_step "Waiting for key services to be ready (timeout 5 min)..."
    
    kubectl wait --for=condition=Ready pod \
        -l app.kubernetes.io/name=erp-system-frontend \
        -n "$NAMESPACE" \
        --timeout=300s 2>/dev/null || log_warn "Frontend timeout (may still be starting)"
    
    log_info "✓ Services initialized"
}

# Setup port-forwards
setup_portforwards() {
    log_step "Setting up port-forwards..."
    
    # Kill any existing port-forwards
    pkill -f "kubectl port-forward" 2>/dev/null || true
    sleep 1
    
    # Start new port-forwards in background
    nohup kubectl port-forward svc/erp-system-frontend 3000:3000 -n "$NAMESPACE" \
        > /tmp/erp-frontend-pf.log 2>&1 &
    
    nohup kubectl port-forward svc/erp-system-gateway 4000:4000 -n "$NAMESPACE" \
        > /tmp/erp-gateway-pf.log 2>&1 &
    
    sleep 2
    
    log_info "✓ Port-forwards started:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Gateway:  http://localhost:4000/graphql"
}

# Show status
show_status() {
    log_step "Cluster Status"
    
    echo "Namespace: $NAMESPACE"
    echo ""
    
    log_info "Ready Pods (1/1 or 2/2):"
    kubectl get pods -n "$NAMESPACE" 2>/dev/null | grep "1/1\|2/2" | grep Running || echo "  (none yet)"
    
    echo ""
    log_info "Initializing Pods:"
    kubectl get pods -n "$NAMESPACE" 2>/dev/null | grep "0/1.*Running" || echo "  (none)"
    
    echo ""
    log_info "Database:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=postgresql 2>/dev/null || echo "  (not found)"
    
    echo ""
    log_info "Port-forwards:"
    netstat -tlnp 2>/dev/null | grep -E "3000|4000" || echo "  (none detected; check /tmp/erp-frontend-pf.log and /tmp/erp-gateway-pf.log)"

    echo ""
    echo "Access points:"
    if netstat -tln 2>/dev/null | grep -q ":3000 "; then
        echo "  Frontend:    http://localhost:3000"
    else
        echo "  Frontend:    port-forward not active"
    fi
    if netstat -tln 2>/dev/null | grep -q ":4000 "; then
        echo "  Gateway:     http://localhost:4000/graphql"
    else
        echo "  Gateway:     port-forward not active"
    fi
    echo "  Kubernetes:  kubectl get pods -n $NAMESPACE --watch"
}

# Clean up (optional)
cleanup() {
    log_step "Cleaning up cluster..."
    
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" || log_warn "Helm release not found"
    kubectl delete namespace "$NAMESPACE" --ignore-not-found || log_warn "Namespace deletion in progress"
    
    pkill -f "kubectl port-forward" 2>/dev/null || true
    
    log_info "✓ Cleanup complete"
}

# Main logic
main() {
    local action="${1:-full}"
    
    case "$action" in
        full)
            check_requirements
            ensure_namespace
            ensure_secrets
            build_images
            load_images
            deploy_helm
            wait_for_services
            setup_portforwards
            show_status
            ;;
        rebuild)
            build_images
            load_images
            deploy_helm
            wait_for_services
            setup_portforwards
            show_status
            ;;
        deploy)
            check_requirements
            ensure_namespace
            ensure_secrets
            deploy_helm
            wait_for_services
            show_status
            ;;
        portforward)
            setup_portforwards
            show_status
            ;;
        status)
            show_status
            ;;
        clean)
            cleanup
            ;;
        *)
            echo "Usage: $0 {full|rebuild|deploy|portforward|status|clean}"
            echo ""
            echo "Actions:"
            echo "  full        - Build all images, load to k3s, deploy (default)"
            echo "  rebuild     - Rebuild images and redeploy"
            echo "  deploy      - Deploy/upgrade Helm chart only (images must exist)"
            echo "  portforward - Setup port-forwards to existing services"
            echo "  status      - Show cluster status"
            echo "  clean       - Remove all resources from cluster"
            exit 1
            ;;
    esac
}

main "$@"
