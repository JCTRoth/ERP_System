#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ERP System — Build & Push All Images to GHCR (for k3s Deployment)
#
# Builds all 12 service images for linux/amd64 and pushes them to
# ghcr.io/jctroth. Uses Docker buildx for cross-platform builds.
#
# Usage:
#   bash scripts/k3s-build-push-erp.sh [OPTIONS]
#
# OPTIONS:
#   --tag TAG         Image tag (default: latest)
#   --skip LIST       Comma-separated services to skip
#   --parallel N      Number of parallel builds (default: 2)
#   --dry-run         Show what would be built without building
#
# Environment Variables:
#   GITHUB_USERNAME   GitHub username (default: jctroth)
#   GITHUB_TOKEN      GitHub PAT — required for push
#   REGISTRY_URL      Registry URL (default: ghcr.io)
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Configuration ─────────────────────────────────────────────────────────
REGISTRY_URL="${REGISTRY_URL:-ghcr.io}"
GITHUB_USERNAME="${GITHUB_USERNAME:-jctroth}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
TAG="${TAG:-latest}"
DRY_RUN="${DRY_RUN:-false}"
PARALLEL_BUILDS="${PARALLEL_BUILDS:-2}"
SKIP_SERVICES="${SKIP_SERVICES:-}"

# ── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# ── Parse args ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag)       TAG="$2"; shift 2 ;;
        --skip)      SKIP_SERVICES="$2"; shift 2 ;;
        --parallel)  PARALLEL_BUILDS="$2"; shift 2 ;;
        --dry-run)   DRY_RUN=true; shift ;;
        *)           echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Services to build (name:context_path) ──────────────────────────────────
declare -a SERVICES=(
    "frontend:apps/frontend"
    "webshop:apps/webshop"
    "gateway:apps/gateway"
    "user-service:apps/services/dotnet/UserService"
    "shop-service:apps/services/dotnet/ShopService"
    "accounting-service:apps/services/dotnet/AccountingService"
    "masterdata-service:apps/services/dotnet/MasterdataService"
    "orders-service:apps/services/dotnet/OrdersService"
    "company-service:apps/services/java/company-service"
    "translation-service:apps/services/java/translation-service"
    "notification-service:apps/services/java/notification-service"
    "scripting-service:apps/services/java/scripting-service"
    "templates-service:apps/services/nodejs/templates-service"
)

FULL_REGISTRY="${REGISTRY_URL}/${GITHUB_USERNAME}"

# ── Login ──────────────────────────────────────────────────────────────────
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ERP System — Build & Push to ${FULL_REGISTRY}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Would build and push the following:${NC}"
    for svc in "${SERVICES[@]}"; do
        NAME="${svc%%:*}"
        echo "  ${FULL_REGISTRY}/erp-${NAME}:${TAG}"
    done
    exit 0
fi

if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
    echo -e "${GREEN}[✓] Logged into ghcr.io${NC}"
else
    echo -e "${YELLOW}[!] GITHUB_TOKEN not set — assuming already logged in${NC}"
fi

# ── Build & Push ───────────────────────────────────────────────────────────
BUILD_COUNT=0
FAIL_COUNT=0

for svc in "${SERVICES[@]}"; do
    NAME="${svc%%:*}"
    CONTEXT="${svc##*:}"

    # Skip if in SKIP_SERVICES list
    if [[ ",${SKIP_SERVICES}," == *",${NAME},"* ]]; then
        echo -e "${YELLOW}[SKIP] erp-${NAME}${NC}"
        continue
    fi

    IMAGE="${FULL_REGISTRY}/erp-${NAME}:${TAG}"
    echo ""
    echo -e "${BLUE}[BUILD] erp-${NAME} → ${IMAGE}${NC}"

    if docker buildx build \
        --platform linux/amd64 \
        --tag "$IMAGE" \
        --push \
        "$REPO_ROOT/$CONTEXT"; then
        echo -e "${GREEN}[✓] erp-${NAME}${NC}"
        BUILD_COUNT=$((BUILD_COUNT + 1))
    else
        echo -e "${RED}[✗] erp-${NAME} FAILED${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Built: ${GREEN}${BUILD_COUNT}${NC}  Failed: ${RED}${FAIL_COUNT}${NC}  Tag: ${TAG}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
