#!/bin/bash

# ERP System Local Startup Script
# Architecture: Start one service at a time in dependency order, verify each before proceeding.
#
# Startup order:
# 1. Pre-flight checks (Docker, compose file, ports)
# 2. Infrastructure: PostgreSQL → MinIO → Prometheus → Grafana
# 3. Backend services (one by one, each verified before next starts)
# 4. Gateway (verified before frontend)
# 5. Frontend + Webshop
# 6. Open browser, list all services

set -o pipefail

# ============================================================================
# Configuration
# ============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"
DC="docker compose -f $COMPOSE_FILE"

# Timeouts (seconds)
HEALTH_TIMEOUT=3          # per health-check request
HEALTH_MAX_ATTEMPTS=60    # number of attempts per service (60 × 3s = 180s, enough for dotnet build on first run)
HEALTH_INTERVAL=3         # seconds between attempts
DB_MAX_ATTEMPTS=60        # postgres readiness (first boot may need longer)
DOTNET_MAX_ATTEMPTS=120   # .NET services compile from source on first boot (120 × 3s = 360s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
STARTED=0
FAILED=0
FAILED_SERVICES=()

# ============================================================================
# Logging
# ============================================================================

print_status()  { echo -e "  ${GREEN}✓${NC} $1"; }
print_info()    { echo -e "  ${BLUE}i${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}!${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_header()  {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
print_step() {
    local n=$1 total=$2 name=$3
    echo ""
    echo -e "  ${CYAN}[$n/$total]${NC} ${BOLD}$name${NC}"
}

# ============================================================================
# Health check helpers
# ============================================================================

# Generic HTTP health check: waits until the URL responds with 2xx
wait_for_http() {
    local label="$1" url="$2"
    local max="${3:-$HEALTH_MAX_ATTEMPTS}"
    local attempt=0

    while [ $attempt -lt $max ]; do
        if curl -sf --max-time "$HEALTH_TIMEOUT" "$url" >/dev/null 2>&1; then
            print_status "$label is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        [ $attempt -lt $max ] && sleep "$HEALTH_INTERVAL"
    done

    print_warning "$label did not pass health check after $((max * HEALTH_INTERVAL))s"
    return 1
}

# GraphQL health check: sends {__typename} query
wait_for_graphql() {
    local label="$1" port="$2"
    local max="${3:-$HEALTH_MAX_ATTEMPTS}"
    local attempt=0

    while [ $attempt -lt $max ]; do
        if curl -sf --max-time "$HEALTH_TIMEOUT" -X POST \
            -H "Content-Type: application/json" \
            -d '{"query":"{__typename}"}' \
            "http://localhost:$port/graphql" >/dev/null 2>&1; then
            print_status "$label GraphQL is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        [ $attempt -lt $max ] && sleep "$HEALTH_INTERVAL"
    done

    print_warning "$label did not respond after $((max * HEALTH_INTERVAL))s"
    return 1
}

# Start a docker compose service and wait for it to become healthy.
# Args: compose_name display_name health_check_function [health_args...]
start_service() {
    local compose_name="$1"
    local display_name="$2"
    shift 2

    # Use --build for services with a build directive (avoids stale cached images)
    local build_flag=""
    if $DC config --format json 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
sys.exit(0 if 'build' in d.get('services',{}).get('$compose_name',{}) else 1)
" 2>/dev/null; then
        build_flag="--build"
    fi

    if ! $DC up -d $build_flag "$compose_name" >/dev/null 2>&1; then
        print_error "$display_name — failed to start container"
        FAILED=$((FAILED + 1))
        FAILED_SERVICES+=("$display_name")
        return 1
    fi

    "$@"
    local rc=$?

    if [ $rc -eq 0 ]; then
        STARTED=$((STARTED + 1))
        return 0
    else
        FAILED=$((FAILED + 1))
        FAILED_SERVICES+=("$display_name")
        return 1
    fi
}

# ============================================================================
# Pre-flight checks
# ============================================================================

preflight_checks() {
    print_header "Pre-flight Checks"

    # Docker
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    print_status "Docker is running"

    # Compose file
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    print_status "Compose file: $COMPOSE_FILE"

    # Already running?
    local running_count
    running_count=$(docker ps --format "{{.Names}}" | grep -E "(gateway|user-service|postgres)" | wc -l)
    if [ "$running_count" -ge 3 ]; then
        print_warning "ERP System appears to already be running!"
        echo ""
        print_info "To see running services: $0 ports"
        print_info "To stop the system:       $0 stop"
        exit 0
    fi
    print_status "No existing ERP services detected"

    # Port availability
    local ports=(
        "5173:Frontend" "5174:Webshop" "4000:Gateway"
        "5000:UserService" "5001:AccountingService" "5002:MasterdataService"
        "5003:ShopService" "5004:OrdersService"
        "8080:CompanyService" "8081:TranslationService" "8082:NotificationService"
        "8083:ScriptingService" "8087:TemplatesService"
        "15432:PostgreSQL" "9000:MinIO" "9001:MinIO-Console"
    )

    local port_conflicts=0
    for entry in "${ports[@]}"; do
        local port="${entry%%:*}"
        local name="${entry#*:}"
        if nc -z localhost "$port" >/dev/null 2>&1; then
            print_warning "$name ($port) — port already in use"
            port_conflicts=$((port_conflicts + 1))
        fi
    done

    if [ "$port_conflicts" -gt 0 ]; then
        print_warning "$port_conflicts port(s) in use — run '$0 stop' first"
        exit 1
    fi
    print_status "All ports available"
}

# ============================================================================
# Startup sequence — each service started individually and verified
# ============================================================================

run_startup() {
    local total=16
    local step=0

    print_header "Starting ERP System ($total services)"

    # ---- 1. PostgreSQL ----

    step=$((step + 1))
    print_step $step $total "PostgreSQL"
    if $DC up -d postgres >/dev/null 2>&1; then
        local attempt=0
        while [ $attempt -lt $DB_MAX_ATTEMPTS ]; do
            # Check docker compose health status (not just pg_isready —
            # the healthcheck also verifies init-multi-db.sh created the users)
            local health
            health=$($DC ps postgres --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health',''))" 2>/dev/null || echo "")
            if [ "$health" = "healthy" ]; then
                print_status "PostgreSQL is healthy (init script completed)"
                STARTED=$((STARTED + 1))
                break
            fi
            attempt=$((attempt + 1))
            sleep 1
        done
        if [ $attempt -ge $DB_MAX_ATTEMPTS ]; then
            print_error "PostgreSQL not healthy after ${DB_MAX_ATTEMPTS}s"
            FAILED=$((FAILED + 1))
            FAILED_SERVICES+=("PostgreSQL")
        fi
    else
        print_error "PostgreSQL — failed to start container"
        FAILED=$((FAILED + 1))
        FAILED_SERVICES+=("PostgreSQL")
    fi

    # ---- 2. MinIO ----

    step=$((step + 1))
    print_step $step $total "MinIO"
    start_service "minio" "MinIO" wait_for_http "MinIO" "http://localhost:9001" || true

    # ---- 3. Prometheus ----

    step=$((step + 1))
    print_step $step $total "Prometheus"
    start_service "prometheus" "Prometheus" wait_for_http "Prometheus" "http://localhost:9090" || true

    # ---- 4. Grafana ----

    step=$((step + 1))
    print_step $step $total "Grafana"
    start_service "grafana" "Grafana" wait_for_http "Grafana" "http://localhost:3001/api/health" || true

    # ---- .NET Services (compile from source — need longer timeout) ----

    step=$((step + 1))
    print_step $step $total "User Service (.NET)"
    start_service "user-service" "User Service" wait_for_graphql "User Service" 5000 $DOTNET_MAX_ATTEMPTS || true

    step=$((step + 1))
    print_step $step $total "Accounting Service (.NET)"
    start_service "accounting-service" "Accounting Service" wait_for_graphql "Accounting Service" 5001 $DOTNET_MAX_ATTEMPTS || true

    step=$((step + 1))
    print_step $step $total "Masterdata Service (.NET)"
    start_service "masterdata-service" "Masterdata Service" wait_for_graphql "Masterdata Service" 5002 $DOTNET_MAX_ATTEMPTS || true

    step=$((step + 1))
    print_step $step $total "Shop Service (.NET)"
    start_service "shop-service" "Shop Service" wait_for_graphql "Shop Service" 5003 $DOTNET_MAX_ATTEMPTS || true

    step=$((step + 1))
    print_step $step $total "Orders Service (.NET)"
    start_service "orders-service" "Orders Service" wait_for_graphql "Orders Service" 5004 $DOTNET_MAX_ATTEMPTS || true

    # ---- Java Services ----

    step=$((step + 1))
    print_step $step $total "Company Service (Java)"
    start_service "company-service" "Company Service" wait_for_graphql "Company Service" 8080 || true

    step=$((step + 1))
    print_step $step $total "Translation Service (Java)"
    start_service "translation-service" "Translation Service" wait_for_graphql "Translation Service" 8081 || true

    step=$((step + 1))
    print_step $step $total "Notification Service (Java)"
    start_service "notification-service" "Notification Service" wait_for_graphql "Notification Service" 8082 || true

    step=$((step + 1))
    print_step $step $total "Scripting Service (Java)"
    start_service "scripting-service" "Scripting Service" wait_for_graphql "Scripting Service" 8083 || true

    # ---- Node.js Service ----

    step=$((step + 1))
    print_step $step $total "Templates Service (Node.js)"
    start_service "templates-service" "Templates Service" wait_for_http "Templates Service" "http://localhost:8087/actuator/health" || true

    # ---- Gateway (depends on most backend services) ----

    step=$((step + 1))
    print_step $step $total "GraphQL Gateway"
    start_service "gateway" "Gateway" wait_for_graphql "Gateway" 4000 || true

    # ---- Frontends (depend on gateway) ----

    step=$((step + 1))
    print_step $step $total "Frontend & Webshop"
    if $DC up -d --build frontend webshop >/dev/null 2>&1; then
        local frontend_ok=false webshop_ok=false
        local attempt=0

        while [ $attempt -lt $HEALTH_MAX_ATTEMPTS ]; do
            if ! $frontend_ok && curl -sf --max-time "$HEALTH_TIMEOUT" "http://localhost:5173" >/dev/null 2>&1; then
                frontend_ok=true
                print_status "Frontend is serving content"
            fi
            if ! $webshop_ok && curl -sf --max-time "$HEALTH_TIMEOUT" "http://localhost:5174" >/dev/null 2>&1; then
                webshop_ok=true
                print_status "Webshop is serving content"
            fi
            $frontend_ok && $webshop_ok && break
            attempt=$((attempt + 1))
            [ $attempt -lt $HEALTH_MAX_ATTEMPTS ] && sleep "$HEALTH_INTERVAL"
        done

        if $frontend_ok && $webshop_ok; then
            STARTED=$((STARTED + 2))
        elif $frontend_ok || $webshop_ok; then
            STARTED=$((STARTED + 1))
            FAILED=$((FAILED + 1))
            $frontend_ok || FAILED_SERVICES+=("Frontend")
            $webshop_ok || FAILED_SERVICES+=("Webshop")
        else
            print_warning "Neither frontend nor webshop responded"
            FAILED=$((FAILED + 2))
            FAILED_SERVICES+=("Frontend" "Webshop")
        fi
    else
        print_error "Frontend/Webshop — failed to start containers"
        FAILED=$((FAILED + 2))
        FAILED_SERVICES+=("Frontend" "Webshop")
    fi
}

# ============================================================================
# Results & browser
# ============================================================================

show_results() {
    print_header "Startup Complete"

    local total=$((STARTED + FAILED))
    echo ""
    echo -e "  ${GREEN}Started:${NC}  $STARTED / $total services"

    if [ $FAILED -gt 0 ]; then
        echo -e "  ${RED}Failed:${NC}   $FAILED — ${FAILED_SERVICES[*]}"
    fi

    echo ""
    echo -e "  ${BOLD}Service URLs:${NC}"
    echo ""
    echo "    Frontend               http://localhost:5173"
    echo "    Webshop                http://localhost:5174"
    echo "    GraphQL Gateway        http://localhost:4000/graphql"
    echo ""
    echo "    User Service           http://localhost:5000/graphql"
    echo "    Accounting Service     http://localhost:5001/graphql"
    echo "    Masterdata Service     http://localhost:5002/graphql"
    echo "    Shop Service           http://localhost:5003/graphql"
    echo "    Orders Service         http://localhost:5004/graphql"
    echo "    Company Service        http://localhost:8080/graphql"
    echo "    Translation Service    http://localhost:8081/graphql"
    echo "    Notification Service   http://localhost:8082/graphql"
    echo "    Scripting Service      http://localhost:8083/graphql"
    echo "    Templates Service      http://localhost:8087/api"
    echo ""
    echo "    PostgreSQL             localhost:15432"
    echo "    MinIO Console          http://localhost:9001  (admin/admin)"
    echo "    Prometheus             http://localhost:9090"
    echo "    Grafana                http://localhost:3001  (admin/admin)"
    echo ""
    echo -e "  ${BOLD}Credentials:${NC}"
    echo ""
    echo "    Email:    admin@erp-system.local"
    echo "    Password: Admin123!"
    echo ""

    # Show running containers
    print_header "Running Containers"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
        grep -E "(frontend|webshop|gateway|user-service|shop-service|accounting-service|masterdata-service|orders-service|company-service|translation-service|notification-service|scripting-service|templates-service|postgres|prometheus|minio|grafana)" || true
    echo ""

    # Open browser
    print_info "Opening http://localhost:5173 in browser..."
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:5173" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        open "http://localhost:5173" >/dev/null 2>&1 &
    else
        print_warning "Could not detect browser command — open manually: http://localhost:5173"
    fi
}

# ============================================================================
# Utility commands
# ============================================================================

stop_system() {
    print_header "Stopping ERP System"
    if [ "${2:-}" = "--volumes" ] || [ "${2:-}" = "-v" ]; then
        $DC down -v
        print_status "All containers and volumes stopped"
    else
        $DC down
        print_status "All containers stopped (use '$0 stop -v' to also remove volumes)"
    fi
}

reset_system() {
    print_header "Resetting ERP System"
    print_warning "This will remove ALL containers, volumes, and cached data."
    $DC down -v --remove-orphans 2>/dev/null || true
    # Also remove any cached build images so they rebuild fresh
    docker image prune -f --filter "label=com.docker.compose.project=erp_system" >/dev/null 2>&1 || true
    print_status "System reset complete — all volumes and cached builds removed"
}

show_status() {
    print_header "System Status"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
        grep -E "(frontend|webshop|gateway|user-service|shop-service|accounting-service|masterdata-service|orders-service|company-service|translation-service|notification-service|scripting-service|templates-service|postgres|prometheus|minio|grafana)" || echo "  No ERP services running."
    echo ""
}

show_ports() {
    print_header "Service Port Map"
    echo ""
    echo "    Frontend ............. 5173"
    echo "    Webshop .............. 5174"
    echo "    Gateway .............. 4000"
    echo "    UserService .......... 5000"
    echo "    AccountingService .... 5001"
    echo "    MasterdataService .... 5002"
    echo "    ShopService .......... 5003"
    echo "    OrdersService ........ 5004"
    echo "    CompanyService ....... 8080"
    echo "    TranslationService ... 8081"
    echo "    NotificationService .. 8082"
    echo "    ScriptingService ..... 8083"
    echo "    TemplatesService ..... 8087"
    echo "    PostgreSQL ........... 15432"
    echo "    MinIO ................ 9000 / 9001"
    echo "    Prometheus ........... 9090"
    echo "    Grafana .............. 3001"
    echo ""
    show_status
}

show_logs() {
    cd "$PROJECT_DIR"
    if [ -n "${2:-}" ]; then
        $DC logs -f "$2"
    else
        $DC logs -f
    fi
}

show_help() {
    echo ""
    echo "ERP System — Local Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the ERP system (default)"
    echo "  stop        Stop all containers (use -v to also remove volumes)"
    echo "  reset       Stop everything, remove volumes and cached builds"
    echo "  status      Show running containers"
    echo "  ports       Show service port map"
    echo "  logs [svc]  Stream logs (optionally for one service)"
    echo "  help        Show this help"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    print_header "ERP System Startup"
    cd "$PROJECT_DIR"

    preflight_checks
    run_startup
    show_results

    if [ $FAILED -eq 0 ]; then
        print_status "All services started successfully!"
    else
        print_warning "$FAILED service(s) had issues — check logs with: $0 logs"
    fi
    echo ""
}

# ============================================================================
# Command routing
# ============================================================================

case "${1:-start}" in
    start)  main ;;
    stop)   stop_system "$@" ;;
    reset)  reset_system ;;
    status) show_status ;;
    ports)  show_ports ;;
    logs)   show_logs "$@" ;;
    help|--help|-h) show_help ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
