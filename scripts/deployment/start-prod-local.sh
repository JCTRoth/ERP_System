#!/bin/bash

# ERP System Local Production Simulation Script
# Simulates production deployment on local machine using docker-compose.prod-local.yml
#
# Architecture: Pre-flight checks → Build images → Start infrastructure → Start services → Gateway last
#
# Startup order:
# 1. Pre-flight checks (Docker, compose file)
# 2. Build all service images locally
# 3. Network/reachability pre-checks
# 4. Port availability checks
# 5. Start infrastructure (PostgreSQL)
# 6. Wait for databases
# 7. Start all GraphQL services
# 8. Verify service health
# 9. Start Frontend
# 10. START GATEWAY LAST
# 11. Final verification

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Default compose files
COMPOSE_FILE_REMOTE="$PROJECT_DIR/docker-compose.yml"
COMPOSE_FILE_LOCAL="$PROJECT_DIR/docker-compose.prod-local.yml"
COMPOSE_FILE_DEV="$PROJECT_DIR/docker-compose.dev.yml"

# Mode: remote (use published images) or local (build from source)
MODE="local"

# Helper to run docker compose with selected mode
dc() {
    # Usage: dc [docker-compose-args...]
    if [ "$MODE" = "local" ]; then
        docker compose -f "$COMPOSE_FILE_REMOTE" -f "$COMPOSE_FILE_LOCAL" "$@"
    else
        docker compose -f "$COMPOSE_FILE_REMOTE" "$@"
    fi
}

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
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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
    if [ "$MODE" = "local" ]; then
        if [ ! -f "$COMPOSE_FILE_REMOTE" ] || [ ! -f "$COMPOSE_FILE_LOCAL" ]; then
            print_error "Required docker-compose files not found: $COMPOSE_FILE_REMOTE and/or $COMPOSE_FILE_LOCAL"
            exit 1
        fi
        print_status "Found: $COMPOSE_FILE_REMOTE and $COMPOSE_FILE_LOCAL (local mode)"
    else
        if [ ! -f "$COMPOSE_FILE_REMOTE" ]; then
            print_error "Docker Compose file not found: $COMPOSE_FILE_REMOTE"
            exit 1
        fi
        print_status "Found: $COMPOSE_FILE_REMOTE (remote mode)"
    fi

    # Check if services already running
    print_info "Checking for existing services..."
    local running_count
    running_count=$(docker ps --format "{{.Names}}" | grep -E "(erp-gateway|erp-user-service|erp-postgres)" | wc -l)
    if [ "$running_count" -ge 3 ]; then
        print_warning "ERP System (production) appears to already be running!"
        echo ""
        print_info "To see running services: docker ps --filter name=erp-"
        print_info "To stop the system: docker compose -f $COMPOSE_FILE down"
        exit 0
    fi
    print_status "No existing production services found"
}

# ============================================================================
# PHASE 2: BUILD IMAGES
# ============================================================================

build_images() {
    print_header "PHASE 2: Building Production Images"

    print_info "Building all service images locally..."
    print_info "This may take several minutes..."

    # Build all services (only in local mode)
    if [ "$MODE" = "local" ]; then
        if ! dc build --parallel; then
            print_error "Failed to build service images"
            exit 1
        fi
        print_status "All images built successfully"
    else
        print_info "Remote mode: skipping local builds"
        print_status "Using published images from $COMPOSE_FILE_REMOTE"
    fi

    print_status "All images built successfully"
}

# ============================================================================
# PHASE 3: NETWORK & REACHABILITY CHECKS
# ============================================================================

network_checks() {
    print_header "PHASE 3: Network & Reachability Checks"

    local failed=0

    # Check required ports
    local ports=(15432 4000 5173 5000 5001 5002 5003 5004 8080 8081 8082 8087)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Port $port is already in use"
            failed=$((failed + 1))
        fi
    done

    if [ $failed -gt 0 ]; then
        print_error "Port conflicts detected. Please free up the conflicting ports."
        exit 1
    fi

    print_status "All required ports are available"
}

# ============================================================================
# PHASE 4: START INFRASTRUCTURE
# ============================================================================

start_infrastructure() {
    print_header "PHASE 4: Starting Infrastructure"

    print_info "Starting PostgreSQL database..."
    dc up -d postgres

    # Wait for PostgreSQL to be healthy
    print_info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if dc exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1; then
            print_status "PostgreSQL is ready"
            return 0
        fi

        print_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "PostgreSQL failed to start within expected time"
    exit 1
}

# ============================================================================
# PHASE 5: START SERVICES
# ============================================================================

start_services() {
    print_header "PHASE 5: Starting Services"

    print_info "Starting all GraphQL services..."
    dc up -d \
        user-service \
        company-service \
        masterdata-service \
        accounting-service \
        shop-service \
        orders-service \
        translation-service \
        notification-service \
        templates-service

    # Start MinIO separately (optional for local development)
    print_info "Starting MinIO (optional file storage)..."
    print_info "Starting MinIO (file storage)..."
    if ! dc up -d minio >/dev/null 2>&1; then
        print_error "Failed to start MinIO. MinIO is required for production simulation"
        exit 1
    fi

    # Wait for MinIO to become healthy
    print_info "Waiting for MinIO to be healthy..."
    local max_minio_attempts=20
    local minio_attempt=1
    while [ $minio_attempt -le $max_minio_attempts ]; do
        if dc ps --format "table {{.Name}}\t{{.Status}}" | grep -q "erp-minio.*Up.*(healthy)"; then
            print_status "MinIO is healthy"
            break
        fi
        print_info "Waiting for MinIO... (attempt $minio_attempt/$max_minio_attempts)"
        sleep 3
        minio_attempt=$((minio_attempt + 1))
    done
    if [ $minio_attempt -gt $max_minio_attempts ]; then
        print_error "MinIO did not become healthy in time. Aborting start."
        dc logs minio --tail 50
        exit 1
    fi

    # Wait for services to be ready
    print_info "Waiting for services to initialize (60 seconds)..."
    sleep 60
}

# ============================================================================
# PHASE 6: START FRONTEND
# ============================================================================

start_frontend() {
    print_header "PHASE 6: Starting Frontend"

    print_info "Starting frontend application..."
    dc up -d frontend
}

# ============================================================================
# PHASE 7: START GATEWAY (LAST)
# ============================================================================

start_gateway() {
    print_header "PHASE 7: Starting Gateway"

    print_info "Starting Apollo Gateway (this takes longest to initialize)..."
    dc up -d gateway

    # Wait for gateway to compose schema
    print_info "Waiting for gateway to compose schema (70 seconds)..."
    sleep 70
}

# ============================================================================
# PHASE 8: VERIFICATION
# ============================================================================

verify_deployment() {
    print_header "PHASE 8: Verification"

    # Check container health
    print_info "Checking container status..."
    local unhealthy_count
    unhealthy_count=$(dc ps --format "table {{.Name}}\t{{.Status}}" | grep -c "unhealthy\|exited")

    if [ "$unhealthy_count" -gt 0 ]; then
        print_warning "Some containers are unhealthy or exited:"
        dc ps --format "table {{.Name}}\t{{.Status}}" | grep -E "(unhealthy|exited)"
    else
        print_status "All containers are healthy"
    fi

    # Verify MinIO is running and healthy (required)
    if dc ps --format "table {{.Name}}\t{{.Status}}" | grep -q "erp-minio.*Up.*(healthy)"; then
        print_status "MinIO is running and healthy (file storage available)"
    else
        print_error "MinIO is not healthy or not running. File storage is required for production simulation."
        dc logs minio --tail 50
        exit 1
    fi

    # Test gateway health
    print_info "Testing gateway health..."
    if curl -f -s http://localhost:4000/health >/dev/null 2>&1; then
        print_status "Gateway health check passed"
    else
        print_warning "Gateway health check failed - it may still be initializing"
    fi

    # Test frontend
    print_info "Testing frontend availability..."
    if curl -f -s http://localhost:8088 >/dev/null 2>&1; then
        print_status "Frontend is accessible"
    else
        print_warning "Frontend is not yet accessible"
    fi
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

show_status() {
    print_header "ERP System Production Status"

    echo ""
    print_info "Running containers:"
    dc ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    print_info "Access URLs:"
    echo "  Frontend:    http://localhost:8088"
    echo "  Gateway:     http://localhost:4000/graphql"
    echo "  Health:      http://localhost:4000/health"
    echo "  Metrics:     http://localhost:4000/metrics"
    echo "  PostgreSQL:  localhost:15432 (postgres/postgres)"

    echo ""
    print_info "To view logs: use the script with 'logs' or 'status' (mode-aware)"
    print_info "To stop:      $0 stop [mode]"
    print_info "To restart:   $0 restart [mode]"
}

stop_system() {
    print_header "Stopping ERP System Production"

    print_info "Stopping all services..."
    dc down

    print_status "All services stopped"
}

cleanup() {
    print_header "Cleanup"

    print_info "Removing containers and volumes..."
    dc down -v

    print_info "Removing built images..."
    dc down --rmi local

    print_status "Cleanup completed"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

main() {
    local cmd="${1:-start}"
    # Allow optional mode argument as second param or environment variable MODE
    if [ -n "$2" ]; then
        MODE="$2"
    else
        MODE="${MODE:-local}"
    fi

    case "$cmd" in
        start)
            print_header "🚀 Starting ERP System - Production Simulation"
            echo "This will build and run the ERP system in production mode locally."
            echo "Estimated time: 5-10 minutes"
            echo ""

            preflight_checks
            build_images
            network_checks
            start_infrastructure
            start_services
            start_frontend
            start_gateway
            verify_deployment

            print_header "🎉 Production Simulation Started Successfully!"
            show_status
            ;;

        stop)
            stop_system
            ;;

        status)
            show_status
            ;;

        cleanup)
            cleanup
            ;;

        logs)
            if [ -n "$2" ]; then
                dc logs -f "$2"
            else
                dc logs -f
            fi
            ;;

        restart)
            print_info "Restarting production system..."
            dc restart
            sleep 10
            verify_deployment
            show_status
            ;;

        *)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start    - Start the production simulation (default)"
            echo "  stop     - Stop all services"
            echo "  status   - Show current status"
            echo "  restart  - Restart all services"
            echo "  logs     - Show logs (optionally specify service name)"
            echo "  cleanup  - Stop services and remove containers/volumes/images"
            echo ""
            echo "Examples:"
            echo "  $0 start"
            echo "  $0 logs gateway"
            echo "  $0 stop"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"