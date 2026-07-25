#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ERP System — Deploy to k3s Cluster
#
# Deploys the full ERP system (13 services + PostgreSQL) to the k3s cluster
# under the erp namespace. Builds and pushes images, then applies all k8s
# manifests. TLS is auto-provisioned via cert-manager + Let's Encrypt.
#
# Usage:
#   bash scripts/k3s-deploy-erp.sh [OPTIONS]
#
# OPTIONS:
#   --tag TAG         Image tag (default: latest)
#   --skip-build      Skip building images (use existing registry images)
#   --skip LIST       Comma-separated services to skip building
#   --dry-run         Show what would be deployed without deploying
#   --status          Only show deployment status
#
# Environment Variables:
#   GITHUB_USERNAME   GitHub username (default: jctroth)
#   GITHUB_TOKEN      GitHub PAT for pushing images and creating pull secret
#   KUBECONFIG        Path to k3s kubeconfig (default: ~/.kube/k3s-erp.yaml)
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Configuration ─────────────────────────────────────────────────────────
PROJECT="erp"
SUBDOMAIN="erp"
DOMAIN="${SUBDOMAIN}.shopping-now.net"
REGISTRY="${REGISTRY:-ghcr.io/jctroth}"
TAG="${TAG:-latest}"
SKIP_BUILD="${SKIP_BUILD:-false}"
DRY_RUN="${DRY_RUN:-false}"
STATUS_ONLY="${STATUS_ONLY:-false}"
SKIP_SERVICES="${SKIP_SERVICES:-}"
GITHUB_USERNAME="${GITHUB_USERNAME:-jctroth}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

KUBECONFIG="${KUBECONFIG:-$HOME/.kube/k3s-erp.yaml}"
export KUBECONFIG

# ── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# ── Parse args ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag)         TAG="$2"; shift 2 ;;
        --skip-build)  SKIP_BUILD=true; shift ;;
        --skip)        SKIP_SERVICES="$2"; shift 2 ;;
        --dry-run)     DRY_RUN=true; shift ;;
        --status)      STATUS_ONLY=true; shift ;;
        *)             echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Status only mode ───────────────────────────────────────────────────────
if [ "$STATUS_ONLY" = true ]; then
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  ERP System Status — ${DOMAIN}${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}▶ Pods:${NC}"
    kubectl get pods -n "$PROJECT" -o wide 2>/dev/null || echo "  (no pods yet)"
    echo ""
    echo -e "${CYAN}▶ Services:${NC}"
    kubectl get services -n "$PROJECT" 2>/dev/null || echo "  (no services yet)"
    echo ""
    echo -e "${CYAN}▶ Ingress:${NC}"
    kubectl get ingress -n "$PROJECT" 2>/dev/null || echo "  (no ingress yet)"
    echo ""
    echo -e "${CYAN}▶ Certificates:${NC}"
    kubectl get certificate -n "$PROJECT" 2>/dev/null || echo "  (no certificates yet)"
    echo ""
    echo -e "${CYAN}▶ PVCs:${NC}"
    kubectl get pvc -n "$PROJECT" 2>/dev/null || echo "  (no PVCs yet)"
    exit 0
fi

# ── Dry-run mode ───────────────────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would deploy to k3s:${NC}"
    echo "  Namespace:  $PROJECT"
    echo "  Domain:     $DOMAIN"
    echo "  Registry:   $REGISTRY"
    echo "  Tag:        $TAG"
    echo "  Kubeconfig: $KUBECONFIG"
    echo ""
    echo "  Manifests to apply:"
    for f in "$REPO_ROOT/k8s/"*.yaml; do
        echo "    $(basename "$f")"
    done
    echo ""
    echo "  kubectl apply --dry-run=client -f $REPO_ROOT/k8s/"
    kubectl apply --dry-run=client --validate=false -f "$REPO_ROOT/k8s/" 2>&1 | head -20 || true
    exit 0
fi

# ── Header ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ERP System Deploy → k3s${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "  Registry:   ${REGISTRY}"
echo -e "  Tag:        ${TAG}"
echo -e "  Namespace:  ${PROJECT}"
echo -e "  Domain:     ${DOMAIN}"
echo -e "  Kubeconfig: ${KUBECONFIG}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# ── Verify cluster connectivity ───────────────────────────────────────────
echo -e "${CYAN}▶ Verifying cluster connection...${NC}"
if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}[✗] Cannot connect to cluster. Check KUBECONFIG=${KUBECONFIG}${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Connected${NC}"

# ── Build & push (unless skipped) ──────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo -e "${CYAN}▶ Building & pushing all images...${NC}"
    SKIP_ARG=""
    [ -n "$SKIP_SERVICES" ] && SKIP_ARG="--skip $SKIP_SERVICES"
    bash "$SCRIPT_DIR/k3s-build-push-erp.sh" --tag "$TAG" $SKIP_ARG
else
    echo -e "${YELLOW}  ⏭  Skipping build (--skip-build)${NC}"
fi

# ── Ensure namespace ───────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}▶ Ensuring namespace '${PROJECT}'...${NC}"
kubectl create namespace "$PROJECT" --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}  ✓ Namespace ready${NC}"

# ── Ensure GHCR pull secret ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}▶ Creating/updating GHCR pull secret...${NC}"
if [ -n "$GITHUB_TOKEN" ]; then
    kubectl create secret docker-registry ghcr-secret \
        --docker-server=ghcr.io \
        --docker-username="$GITHUB_USERNAME" \
        --docker-password="$GITHUB_TOKEN" \
        --namespace="$PROJECT" \
        --dry-run=client -o yaml | kubectl apply -f -
    echo -e "${GREEN}  ✓ Pull secret ready${NC}"
else
    echo -e "${YELLOW}  ⚠ GITHUB_TOKEN not set — pull secret may need manual creation${NC}"
    echo -e "${YELLOW}    Run: kubectl create secret docker-registry ghcr-secret --docker-server=ghcr.io --docker-username=YOURUSER --docker-password=YOURTOKEN -n ${PROJECT}${NC}"
fi

# ── Apply Kubernetes manifests ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}▶ Applying Kubernetes manifests...${NC}"
kubectl apply -f "$REPO_ROOT/k8s/"
echo -e "${GREEN}  ✓ Manifests applied${NC}"

# ── Wait for PostgreSQL ────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}▶ Waiting for PostgreSQL...${NC}"
kubectl wait --for=condition=ready pod -l app=erp-postgres -n "$PROJECT" --timeout=120s 2>/dev/null || \
    echo -e "${YELLOW}  ⚠ PostgreSQL not ready yet (may need more time)${NC}"
echo -e "${GREEN}  ✓ PostgreSQL running${NC}"

# ── Wait for core services ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}▶ Waiting for deployments to roll out...${NC}"
DEPLOYMENTS=(
    "erp-gateway"
    "erp-frontend"
    "erp-user-service"
    "erp-shop-service"
    "erp-accounting-service"
    "erp-masterdata-service"
    "erp-orders-service"
    "erp-company-service"
    "erp-translation-service"
    "erp-notification-service"
    "erp-templates-service"
)

FAILED_DEPLOYS=()
for dep in "${DEPLOYMENTS[@]}"; do
    if kubectl rollout status deployment/"$dep" -n "$PROJECT" --timeout=120s 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $dep"
    else
        echo -e "  ${YELLOW}⚠${NC} $dep (still rolling out)"
        FAILED_DEPLOYS+=("$dep")
    fi
done

# ── Show status ────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Status${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}▶ Pods:${NC}"
kubectl get pods -n "$PROJECT" -o wide
echo ""
echo -e "${CYAN}▶ Services:${NC}"
kubectl get services -n "$PROJECT"
echo ""
echo -e "${CYAN}▶ Ingress:${NC}"
kubectl get ingress -n "$PROJECT"

# ── Final summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
if [ ${#FAILED_DEPLOYS[@]} -gt 0 ]; then
    echo -e " ${YELLOW}⚠  Deployment partially complete — some services still starting${NC}"
    echo -e " ${YELLOW}   Waiting: ${FAILED_DEPLOYS[*]}${NC}"
else
    echo -e " ${GREEN}✅  Deployment complete!${NC}"
fi
echo ""
echo -e "  URL:  ${CYAN}https://${DOMAIN}${NC}"
echo -e "  Shop: ${CYAN}https://${DOMAIN}/shop${NC}"
echo -e "  (TLS certificate may take 2–5 minutes on first deploy)"
echo ""
echo -e "  Check cert:  kubectl get certificate -n ${PROJECT}"
echo -e "  Check logs:  kubectl logs -n ${PROJECT} -f deploy/erp-gateway"
echo -e "  Status:      bash scripts/k3s-deploy-erp.sh --status"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ ${#FAILED_DEPLOYS[@]} -gt 0 ]; then
    exit 1
fi
