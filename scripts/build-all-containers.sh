#!/usr/bin/env bash
# Build all ERP System Docker container images locally.
# Usage: ./scripts/build-all-containers.sh [--no-cache]
#
# Options:
#   --no-cache   Pass --no-cache to every docker build
#
# Images built (tag: erp/<name>:latest):
#   frontend, gateway
#   user-service, shop-service, accounting-service, masterdata-service, orders-service
#   company-service, translation-service, notification-service, scripting-service, edifact-service
#   templates-service
#
# Run from the repository root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Flags ────────────────────────────────────────────────────────────────────
NO_CACHE=""
for arg in "$@"; do
    case "$arg" in
        --no-cache) NO_CACHE="--no-cache" ;;
        *) echo -e "${RED}Unknown argument: $arg${NC}"; exit 1 ;;
    esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
TOTAL=0
PASSED=0
FAILED=0
FAILED_IMAGES=()

build() {
    local name="$1"
    local tag="erp/${name}:latest"
    shift
    # remaining args are passed directly to docker build

    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}▶  Building ${tag}...${NC}"

    if docker build $NO_CACHE -t "$tag" "$@"; then
        echo -e "${GREEN}✓  ${tag}${NC}\n"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗  ${tag} FAILED${NC}\n"
        FAILED=$((FAILED + 1))
        FAILED_IMAGES+=("$tag")
    fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  ERP System – Build All Container Images${NC}"
[[ -n "$NO_CACHE" ]] && echo -e "${YELLOW}  (--no-cache enabled)${NC}"
echo -e "${BLUE}================================================${NC}\n"

cd "$PROJECT_ROOT"

# ── Frontend ──────────────────────────────────────────────────────────────────
build frontend \
    -f apps/frontend/Dockerfile \
    ./apps/frontend

# ── Gateway ───────────────────────────────────────────────────────────────────
build gateway \
    -f apps/gateway/Dockerfile \
    ./apps/gateway

# ── .NET services (build context is the dotnet/ folder) ───────────────────────
cd apps/services

build user-service        -f dotnet/UserService/Dockerfile        dotnet
build shop-service        -f dotnet/ShopService/Dockerfile        dotnet
build accounting-service  -f dotnet/AccountingService/Dockerfile  dotnet
build masterdata-service  -f dotnet/MasterdataService/Dockerfile  dotnet
build orders-service      -f dotnet/OrdersService/Dockerfile      dotnet

# ── Java services ─────────────────────────────────────────────────────────────
build company-service      ./java/company-service
build translation-service  ./java/translation-service
build notification-service ./java/notification-service
build scripting-service    ./java/scripting-service
build edifact-service      ./java/edifact-service

# ── Node.js services ──────────────────────────────────────────────────────────
build templates-service ./nodejs/templates-service

cd "$PROJECT_ROOT"

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Build Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "  Total:   ${TOTAL}"
echo -e "  ${GREEN}Passed:  ${PASSED}${NC}"
echo -e "  ${RED}Failed:  ${FAILED}${NC}"

if [[ ${#FAILED_IMAGES[@]} -gt 0 ]]; then
    echo -e "\n${RED}Failed images:${NC}"
    for img in "${FAILED_IMAGES[@]}"; do
        echo -e "  ${RED}• ${img}${NC}"
    done
    exit 1
fi

echo -e "\n${GREEN}All images built successfully.${NC}"
