#!/bin/bash

# ERP System Local Seeding Script
# Ensures every backend service started by start-local.sh is seeded with demo data.
#
# Seeding itself is performed by the services at startup (code-based, idempotent):
#   - .NET services  -> SeedDataService / DbContext HasData / MasterdataInitializer
#   - Java services  -> CommandLineRunner / ApplicationRunner seeders (moved from SQL)
# This script VERIFIES the result in each service database and, if a service's
# database is empty, restarts that service so its startup seeding re-runs.
#
# Usage (from repository root):
#   ./scripts/dev/seed-local.sh            # verify & fix seeding for all services
#   ./scripts/dev/seed-local.sh --dry-run  # only report, never restart
#   ./scripts/dev/seed-local.sh user-service   # only verify one service

set -o pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"
DC="docker compose -f $COMPOSE_FILE"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status()  { echo -e "  ${GREEN}✓${NC} $1"; }
print_info()    { echo -e "  ${BLUE}i${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}!${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }

DRY_RUN=0
# .NET services compile from source on boot and may need 30-60s to re-seed after a restart
RESTART_POLL_INTERVAL=15
RESTART_MAX_POLLS=12      # 12 x 15s = 3 minutes max wait after restart

# ============================================================================
# Per-service seed checks
#   name          compose service        db         db user     SQL check (row count expected > 0)
#   (Note: masterdata/orders tables are created as quoted PascalCase by EF Core,
#    so they must be quoted in the SQL check.)
# ============================================================================
SEED_CHECKS=(
  # user-service: expect the demo users (anything besides the seeded super admin)
  "user-service|user-service|userdb|erp_user|SELECT count(*) FROM users WHERE email <> 'admin@erp-system.local'"
  "shop-service|shop-service|shopdb|erp_shop|SELECT count(*) FROM products"
  "masterdata-service|masterdata-service|masterdatadb|erp_masterdata|SELECT count(*) FROM \"Currencies\""
  "accounting-service|accounting-service|accountingdb|erp_accounting|SELECT count(*) FROM accounts"
  "orders-service|orders-service|ordersdb|erp_orders|SELECT count(*) FROM \"Orders\""
  "company-service|company-service|companydb|erp_company|SELECT count(*) FROM companies WHERE is_demo = true"
  "notification-service|notification-service|notificationdb|erp_notification|SELECT count(*) FROM email_templates"
  "translation-service|translation-service|translationdb|erp_translation|SELECT count(*) FROM translation_keys"
)

# Run a SQL query in the postgres container against a service database.
# Returns the row count (or empty on failure).
db_count() {
    local db="$1" user="$2" sql="$3"
    $DC exec -T postgres psql -U "$user" -d "$db" -tAc "$sql" 2>/dev/null | tr -d '[:space:]'
}

# Check whether one service database is seeded (row count > 0).
# Usage: check_seeded "user-service|user-service|userdb|erp_user|SELECT..."
check_seeded() {
    local entry="$1"
    IFS='|' read -r name service db user sql <<< "$entry"
    local count
    count=$(db_count "$db" "$user" "$sql")
    if [ -z "$count" ]; then
        # psql failed (container down / table missing) - treat as not seeded
        echo 0
        return 1
    fi
    [ "$count" -gt 0 ] 2>/dev/null && echo "$count" || echo 0
}

seed_one() {
    local entry="$1"
    IFS='|' read -r name service db user sql <<< "$entry"
    local count
    count=$(check_seeded "$entry")
    if [ "$count" -gt 0 ] 2>/dev/null; then
        print_status "$name is seeded ($count row(s))"
        return 0
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        print_warning "$name has NO seed data (dry-run: not restarting)"
        return 1
    fi

    print_warning "$name database is empty — restarting service to trigger code seeding..."
    if ! $DC restart "$service" >/dev/null 2>&1; then
        print_error "$name — failed to restart container"
        return 1
    fi

    local attempt=0
    while [ $attempt -lt $RESTART_MAX_POLLS ]; do
        attempt=$((attempt + 1))
        sleep "$RESTART_POLL_INTERVAL"
        count=$(check_seeded "$entry")
        if [ "$count" -gt 0 ] 2>/dev/null; then
            print_status "$name is seeded ($count row(s))"
            return 0
        fi
    done

    print_error "$name could not be seeded after restart (waited $((RESTART_MAX_POLLS * RESTART_POLL_INTERVAL))s)"
    return 1
}

# ============================================================================
# Main
# ============================================================================

# Parse args
SELECTED=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        *) SELECTED="$arg" ;;
    esac
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Seeding verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running — cannot verify seeding"
    exit 1
fi

if ! $DC ps postgres >/dev/null 2>&1; then
    print_error "PostgreSQL is not running — start the stack first (./scripts/dev/start-local.sh)"
    exit 1
fi

SEEDED=0
MISSING=0
FAILED=0

for entry in "${SEED_CHECKS[@]}"; do
    IFS='|' read -r name service db user sql <<< "$entry"
    if [ -n "$SELECTED" ] && [ "$name" != "$SELECTED" ] && [ "$service" != "$SELECTED" ]; then
        continue
    fi
    if seed_one "$entry"; then
        SEEDED=$((SEEDED + 1))
    else
        MISSING=$((MISSING + 1))
        FAILED=$((FAILED + 1))
    fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
    print_status "All $SEEDED service(s) verified seeded."
else
    print_warning "$MISSING service(s) missing seed data."
fi
echo ""

[ "$FAILED" -eq 0 ]
