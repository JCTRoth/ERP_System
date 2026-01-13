#!/bin/bash

# ERP System Local Startup Script (Redesigned)
# Architecture: Pre-flight checks → Network validation → Start infrastructure → Start services → Gateway last
# 
# Startup order:
# 1. Pre-flight checks (Docker, compose file)
# 2. Network/reachability pre-checks
# 3. Port availability checks
# 4. Start infrastructure (PostgreSQL)
# 5. Wait for databases
# 6. Start all GraphQL services
# 7. Verify service health
# 8. START GATEWAY FIRST (needed by frontend)
# 9. Start Frontend
# 10. Final verification

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

# Logging utilities
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# PHASE 1: PRE-FLIGHT CHECKS
# ============================================================================

preflight_checks() {
    print_header "PHASE 1: Pre-flight Checks"

    # Check Docker
    print_info "Checking Docker availability..."
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    print_status "Docker is running"

    # Check Docker Compose file
    print_info "Checking Docker Compose file..."
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    print_status "Found: $COMPOSE_FILE"

    # Check if services already running
    print_info "Checking for existing services..."
    local running_count
    running_count=$(docker ps --format "{{.Names}}" | grep -E "(gateway|user-service|postgres)" | wc -l)
    if [ "$running_count" -ge 3 ]; then
        print_warning "ERP System appears to already be running!"
        echo ""
        print_info "To see running services: $0 ports"
        print_info "To stop the system: $0 stop"
        exit 0
    fi
    print_status "No existing services found"
}

# ============================================================================
# PHASE 2: NETWORK & REACHABILITY CHECKS
# ============================================================================

network_checks() {
    print_header "PHASE 2: Network & Reachability Checks"

    local failed=0

    # Define ports that should be available
    local required_ports=(
        "5173:Frontend"
        "4000:Gateway"
        "5000:UserService"
        "5001:AccountingService"
        "5002:MasterdataService"
        "5003:ShopService"
        "5004:OrdersService"
        "8080:CompanyService"
        "8081:TranslationService"
        "8087:TemplatesService"
        "15432:PostgreSQL"
        "3001:Grafana"
        "9090:Prometheus"
        "9000:MinIO"
        "9001:MinIO-Console"
    )

    print_info "Checking port availability (${#required_ports[@]} ports)..."

    for port_info in "${required_ports[@]}"; do
        local port
        local service
        port=$(echo "$port_info" | cut -d: -f1)
        service=$(echo "$port_info" | cut -d: -f2)

        if nc -z localhost "$port" >/dev/null 2>&1; then
            print_warning "$service ($port) - Already in use (may be from previous run)"
            ((failed++))
        else
            print_status "$service ($port) - Available"
        fi
    done

    if [ $failed -gt 0 ]; then
        print_warning "$failed port(s) already in use"
        print_info "Try: docker compose -f $COMPOSE_FILE down"
        print_info "Then retry the startup script"
        exit 1
    fi
}

# ============================================================================
# PHASE 3: INFRASTRUCTURE STARTUP
# ============================================================================

start_infrastructure() {
    print_header "PHASE 3: Starting Infrastructure"

    cd "$PROJECT_DIR"

    print_info "Starting PostgreSQL database..."
    docker compose -f "$COMPOSE_FILE" up -d postgres >/dev/null 2>&1

    print_status "PostgreSQL container created"
    
    # Start MinIO (S3-compatible storage) so services depending on object storage are available
    print_info "Starting MinIO..."
    docker compose -f "$COMPOSE_FILE" up -d minio >/dev/null 2>&1
    print_status "MinIO container created"
    
    # Wait for database to be ready
    print_info "Waiting for PostgreSQL to accept connections..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        local container_id
        container_id=$(docker compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || true)

        # Also check MinIO readiness
        local minio_id
        minio_id=$(docker compose -f "$COMPOSE_FILE" ps -q minio 2>/dev/null || true)

        if [ -n "$container_id" ]; then
            if docker exec "$container_id" pg_isready -U postgres >/dev/null 2>&1; then
                print_status "PostgreSQL is ready"
                # Check MinIO readiness if started
                if [ -n "$minio_id" ]; then
                    if docker exec "$minio_id" mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1; then
                        print_status "MinIO is reachable"
                        return 0
                    fi
                else
                    return 0
                fi
            fi
        fi

        echo -n "."
        sleep 1
        ((attempt++))
    done

    print_error "PostgreSQL failed to start within 30 seconds"
    return 1
}

# ============================================================================
# PHASE 4: START CORE SERVICES
# ============================================================================

start_services() {
    print_header "PHASE 4: Starting Core Services"

    local services=(
        "user-service"
        "translation-service"
        "company-service"
        "shop-service"
        "masterdata-service"
        "accounting-service"
        "orders-service"
        "templates-service"
        "minio"
    )

    print_info "Starting ${#services[@]} services..."

    for service in "${services[@]}"; do
        docker compose -f "$COMPOSE_FILE" up -d "$service" >/dev/null 2>&1
        print_status "Started: $service"
    done

    print_info "Waiting for services to initialize..."
    sleep 5
}

# ============================================================================
# PHASE 5: HEALTH CHECKS
# ============================================================================

check_service_health() {
    local service=$1
    local port=$2
    local max_attempts=8
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 3 "http://localhost:$port/health" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        ((attempt++))
    done

    return 1
}

check_graphql_endpoint() {
    local service=$1
    local port=$2
    local max_attempts=8
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 3 -X POST \
            -H "Content-Type: application/json" \
            -d '{"query":"{__typename}"}' \
            "http://localhost:$port/graphql" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        ((attempt++))
    done

    return 1
}

verify_services() {
    print_header "PHASE 5: Verifying Service Health"

    local services=(
        "UserService:5000"
        "ShopService:5003"
        "AccountingService:5001"
        "MasterdataService:5002"
        "OrdersService:5004"
        "MinIO:9001"
    )

    local healthy=0
    local failed=0

    print_info "Running health checks (${#services[@]} services)..."

    for service_info in "${services[@]}"; do
        local service
        local port
        service=$(echo "$service_info" | cut -d: -f1)
        port=$(echo "$service_info" | cut -d: -f2)

        print_info "Checking $service ($port)..."

        if check_service_health "$service" "$port"; then
            print_status "$service - Health check passed"
            ((healthy++))
        else
            print_warning "$service - Health check failed"
            ((failed++))
        fi
    done

    print_info "Running GraphQL endpoint checks..."
    for service_info in "${services[@]}"; do
        local service
        local port
        service=$(echo "$service_info" | cut -d: -f1)
        port=$(echo "$service_info" | cut -d: -f2)

        if check_graphql_endpoint "$service" "$port"; then
            print_status "$service GraphQL - Ready"
        else
            print_warning "$service GraphQL - Not responding (may still be initializing)"
        fi
    done

    echo ""
    echo "Health check summary: $healthy/${#services[@]} services healthy"

    if [ $healthy -lt $((${#services[@]} - 1)) ]; then
        print_warning "Some services are not healthy yet, but continuing..."
    fi
}

# ============================================================================
# PHASE 7: START FRONTEND
# ============================================================================

start_frontend() {
    print_header "PHASE 7: Starting Frontend"

    print_info "Starting frontend container..."
    docker compose -f "$COMPOSE_FILE" up -d frontend >/dev/null 2>&1
    print_status "Frontend container started"

    print_info "Waiting for UI to be available (checking for content)..."
    local max_attempts=10
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 5 "http://localhost:5173" >/dev/null 2>&1; then
            print_status "UI is serving content"
            return 0
        fi
        echo -n "."
        sleep 3
        ((attempt++))
    done

    print_warning "UI not responding yet (still loading is normal)"
    return 1
}

# ============================================================================
# PHASE 6: START GATEWAY (FIRST - needed by frontend)
# ============================================================================

start_gateway() {
    print_header "PHASE 6: Starting GraphQL Gateway (FIRST - needed by frontend)"

    print_info "Starting Apollo Gateway..."
    docker compose -f "$COMPOSE_FILE" up -d gateway >/dev/null 2>&1
    print_status "Gateway container started"

    print_info "Waiting for Gateway to become ready (with extended service initialization delay)..."
    local max_attempts=40
    local attempt=0
    local restart_count=0

    while [ $attempt -lt $max_attempts ]; do
        # Check if gateway port is listening
        if timeout 3 bash -c ">/dev/tcp/localhost/4000" 2>/dev/null; then
            print_status "Gateway is listening on port 4000"
            
            # Try to query GraphQL endpoint
            if curl -sf --max-time 5 -X POST "http://localhost:4000/graphql" \
                -H "Content-Type: application/json" \
                -d '{"query":"{__typename}"}' >/dev/null 2>&1; then
                print_status "Gateway is responding to GraphQL queries"
                return 0
            fi
        fi
        
        # If we've tried for a while and gateway is not responding, restart it
        if [ $attempt -gt 10 ] && [ $((attempt % 10)) -eq 0 ] && [ $restart_count -lt 2 ]; then
            print_info "Gateway still not ready, restarting container (attempt $((restart_count + 1)))..."
            docker compose -f "$COMPOSE_FILE" restart gateway >/dev/null 2>&1
            ((restart_count++))
            sleep 5
        fi
        
        echo -n "."
        sleep 3
        ((attempt++))
    done

    print_warning "Gateway not fully ready after extended wait"
    print_info "The gateway may continue to retry connecting to federated services in the background"
    return 1
}

# ============================================================================
# PHASE 8: FINAL VERIFICATION
# ============================================================================

final_verification() {
    print_header "PHASE 8: Final System Verification"

    local checks_passed=0
    local checks_total=2

    print_info "Verifying critical endpoints..."

    # Check Gateway GraphQL (non-blocking with timeout)
    print_info "Testing Gateway GraphQL endpoint..."
    local gw_response
    gw_response=$(timeout 5 curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"query":"{__typename}"}' \
        "http://localhost:4000/graphql" 2>&1) || gw_response="timeout"
    
    if [ "$gw_response" != "timeout" ] && [ -n "$gw_response" ]; then
        print_status "Gateway GraphQL endpoint is responding"
        ((checks_passed++))
    else
        print_warning "Gateway GraphQL endpoint not responding (services may still be initializing)"
    fi

    # Check Frontend (non-blocking with timeout)
    print_info "Testing Frontend UI availability..."
    if timeout 5 curl -sf "http://localhost:5173" >/dev/null 2>&1; then
        print_status "Frontend UI is serving content"
        ((checks_passed++))
    else
        print_warning "Frontend UI is not responding yet"
    fi

    echo ""
    echo "Verification Summary: $checks_passed/$checks_total endpoints verified"

    if [ $checks_passed -eq $checks_total ]; then
        print_status "All systems operational!"
        return 0
    else
        print_warning "Some systems are still initializing (this is normal on first startup)"
        return 1
    fi
}

# ============================================================================
# DISPLAY INFORMATION
# ============================================================================

display_access_information() {
    print_header "System Startup Complete!"

    echo ""
    echo -e "${GREEN}Access URLs:${NC}"
    echo ""
    echo "  Frontend:               http://localhost:5173"
    echo "  GraphQL Gateway:        http://localhost:4000/graphql"
    echo "  User Service:           http://localhost:5000/graphql"
    echo "  Shop Service:           http://localhost:5003/graphql"
    echo "  Accounting Service:     http://localhost:5001/graphql"
    echo "  Masterdata Service:     http://localhost:5002/graphql"
    echo "  Orders Service:         http://localhost:5004/graphql"
    echo "  Company Service:        http://localhost:8080/graphql"
    echo "  Translation Service:    http://localhost:8081/graphql"
    echo "  Templates Service:      http://localhost:8087/api"
    echo ""
    echo "  PostgreSQL (dev):       localhost:15432"
    echo "  Prometheus:             http://localhost:9090"
    echo "  Grafana:                http://localhost:3001"
    echo "  MinIO Storage:          http://localhost:9001 (admin/admin)"
    echo ""

    echo -e "${GREEN}Default Credentials:${NC}"
    echo ""
    echo "  Email:    admin@erp-system.local"
    echo "  Password: Admin123!"
    echo ""

    echo -e "${GREEN}Useful Commands:${NC}"
    echo ""
    echo "  View running services:  $0 ports"
    echo "  Stop the system:        $0 stop"
    echo "  View logs:              docker compose -f docker-compose.dev.yml logs -f"
    echo ""
}

display_running_services() {
    print_header "Running Services"

    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
        grep -E "(frontend|gateway|user-service|shop-service|accounting-service|masterdata-service|orders-service|company-service|translation-service|templates-service|postgres|prometheus|grafana|minio)" || true

    echo ""
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

show_ports() {
    print_header "Service Port Mapping"

    echo ""
    echo -e "${GREEN}Standard Service Ports:${NC}"
    echo ""
    echo "  Frontend:               5173"
    echo "  Gateway:                4000"
    echo "  UserService:            5000"
    echo "  AccountingService:      5001"
    echo "  MasterdataService:      5002"
    echo "  ShopService:            5003"
    echo "  OrdersService:          5004"
    echo "  CompanyService:         8080"
    echo "  TranslationService:     8081"
    echo "  TemplatesService:       8087"
    echo "  PostgreSQL:             15432"
    echo "  Prometheus:             9090"
    echo "  Grafana:                3001"
    echo "  MinIO:                  9001"
    echo ""

    display_running_services
}

stop_system() {
    print_header "Stopping ERP System"

    cd "$PROJECT_DIR"

    print_info "Stopping all containers..."
    docker compose -f "$COMPOSE_FILE" down >/dev/null 2>&1

    print_status "All containers stopped"
    echo ""
}

show_status() {
    print_header "System Status"
    echo ""

    display_running_services

    echo -e "${YELLOW}Tip: Use '$0 logs' to view container logs${NC}"
    echo ""
}

show_help() {
    echo ""
    echo "ERP System - Local Startup Script"
    echo ""
    echo "Usage:"
    echo "  $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the ERP system (default)"
    echo "  stop        Stop the ERP system"
    echo "  status      Show system status"
    echo "  ports       Show service ports and URL mappings"
    echo "  help        Show this help message"
    echo ""
    echo "Startup Phases:"
    echo "  1. Pre-flight checks (Docker, ports)"
    echo "  2. Network validation"
    echo "  3. Infrastructure startup (PostgreSQL)"
    echo "  4. Core services startup"
    echo "  5. Service health verification"
    echo "  6. Frontend startup"
    echo "  7. Gateway startup (LAST)"
    echo "  8. Final system verification"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    print_header "ERP System Startup"

    echo ""
    print_info "Starting system with health checks and verification"
    echo ""

    # Phase 1: Pre-flight checks
    preflight_checks || exit 1

    # Phase 2: Network checks
    network_checks || exit 1

    # Phase 3: Start infrastructure
    start_infrastructure || exit 1

    # Phase 4: Start services
    start_services || exit 1

    # Phase 5: Verify services
    verify_services || print_warning "Service verification incomplete, continuing..."

    # Add stabilization time for services to fully initialize
    print_info "Allowing services to fully stabilize..."
    sleep 15

    # Phase 6: Start gateway (FIRST - needed by frontend)
    start_gateway || print_warning "Gateway not responding yet (may still be initializing)"

    # Phase 7: Start frontend
    start_frontend || print_warning "Frontend not responding yet (may still be loading)"

    # Phase 8: Final verification
    final_verification

    # Display information
    display_access_information
    display_running_services

    print_status "ERP System startup sequence completed"
    print_info "Check http://localhost:5173 to access the frontend"
    echo ""
}

# ============================================================================
# COMMAND ROUTING
# ============================================================================

case "${1:-start}" in
    start)
        main
        ;;
    stop)
        stop_system
        ;;
    status)
        show_status
        ;;
    ports)
        show_ports
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
