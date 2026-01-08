#!/bin/bash

# ERP System Local Startup Script
# This script starts the complete ERP system locally using Docker Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_status "Docker is running"
}

# Function to check if docker-compose file exists
check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    print_status "Found Docker Compose file: $COMPOSE_FILE"
}

# Function to wait for database to be ready
# Accepts a docker-compose service name, resolves the container id, and checks pg_isready
wait_for_db() {
    local service_name=$1
    local max_attempts=30  # Reduced from 60
    local attempt=1

    print_status "Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        # Resolve the container id for the compose service
        container_id=$(docker compose -f "$COMPOSE_FILE" ps -q "$service_name" 2>/dev/null || true)

        if [ -n "$container_id" ]; then
            if docker exec "$container_id" pg_isready -U postgres >/dev/null 2>&1; then
                print_status "$service_name (container $container_id) is ready!"
                return 0
            fi
        fi

        echo -n "."
        sleep 1  # Reduced from 2
        ((attempt++))
    done

    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to check service health (parallel version)
check_service_health_parallel() {
    local services=("$@")
    local pids=()
    local results=()

    print_status "Checking health of ${#services[@]} services in parallel..."

    # Start health checks in parallel
    for service_info in "${services[@]}"; do
        local service_name
        service_name=$(echo "$service_info" | cut -d: -f1)
        local port
        port=$(echo "$service_info" | cut -d: -f2)
        local max_attempts=8  # Reduced from 10

        (
            local attempt=1
            while [ $attempt -le $max_attempts ]; do
                if curl -f --max-time 5 http://localhost:"$port"/health >/dev/null 2>&1; then
                    echo "SUCCESS:$service_name"
                    return 0
                fi
                sleep 2  # Reduced from 3
                ((attempt++))
            done
            echo "FAILED:$service_name"
        ) &
        pids+=($!)
    done

    # Wait for all checks to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
        result=$(wait "$pid" 2>/dev/null && echo "SUCCESS" || echo "FAILED")
        results+=("$result")
    done

    # Report results
    local success_count=0
    for result in "${results[@]}"; do
        if [[ $result == SUCCESS* ]]; then
            local service
            service=$(echo "$result" | cut -d: -f2)
            print_status "$service is healthy!"
            ((success_count++))
        else
            local service
            service=$(echo "$result" | cut -d: -f2)
            print_warning "$service health check failed, but continuing..."
        fi
    done

    print_status "Health checks completed: $success_count/${#services[@]} services healthy"
}

# Function to check GraphQL endpoint health (parallel version)
check_graphql_health_parallel() {
    local services=("$@")
    local pids=()
    local results=()

    print_status "Checking GraphQL endpoints for ${#services[@]} services in parallel..."

    # Start GraphQL checks in parallel
    for service_info in "${services[@]}"; do
        local service_name
        service_name=$(echo "$service_info" | cut -d: -f1)
        local port
        port=$(echo "$service_info" | cut -d: -f2)
        local max_attempts=10  # Reduced from 15

        (
            local attempt=1
            while [ $attempt -le $max_attempts ]; do
                if curl -f --max-time 5 -X POST -H "Content-Type: application/json" -d '{"query":"{__typename}"}' http://localhost:"$port"/graphql >/dev/null 2>&1; then
                    echo "SUCCESS:$service_name"
                    return 0
                fi
                sleep 2
                ((attempt++))
            done
            echo "FAILED:$service_name"
        ) &
        pids+=($!)
    done

    # Wait for all checks to complete
    for pid in "${pids[@]}"; do
        if wait "$pid" 2>/dev/null; then
            results+=("SUCCESS")
        else
            results+=("FAILED")
        fi
    done

    # Report results
    local success_count=0
    for result in "${results[@]}"; do
        if [[ $result == SUCCESS* ]]; then
            local service
            service=$(echo "$result" | cut -d: -f2)
            print_status "$service GraphQL endpoint is ready!"
            ((success_count++))
        else
            local service
            service=$(echo "$result" | cut -d: -f2)
            print_warning "$service GraphQL endpoint not ready, but continuing..."
        fi
    done

    print_status "GraphQL checks completed: $success_count/${#services[@]} endpoints ready"
}

# Main startup function
main() {
    print_header "ERP System Local Startup"

    # Pre-flight checks
    check_docker
    check_compose_file

    cd "$PROJECT_DIR"

    # Start infrastructure (databases)
    print_header "Starting Infrastructure"
    print_status "Starting databases..."

    docker compose -f "$COMPOSE_FILE" up -d \
        postgres

    # Wait for consolidated database to be ready
    print_status "Waiting for database to be ready..."
    wait_for_db postgres

    # Start all GraphQL services in parallel
    print_header "Starting GraphQL Dependencies"
    print_status "Bringing up all services in parallel..."

    docker compose -f "$COMPOSE_FILE" up -d \
        user-service \
        translation-service \
        company-service \
        shop-service \
        masterdata-service \
        accounting-service \
        templates-service

    # Give services a moment to spin up (reduced from 10 seconds)
    print_status "Waiting for services to initialize..."
    sleep 5

    # Check all services health in parallel
    check_service_health_parallel \
        "UserService:5000" \
        "TranslationService:8083" \
        "CompanyService:8081" \
        "ShopService:5003" \
        "MasterdataService:5002" \
        "AccountingService:5001" \
        "TemplatesService:8087"

    # Check GraphQL endpoints in parallel
    check_graphql_health_parallel \
        "UserService:5000" \
        "TranslationService:8083" \
        "CompanyService:8081" \
        "ShopService:5003" \
        "MasterdataService:5002" \
        "AccountingService:5001"

    # Start the gateway after dependencies are healthy
    print_header "Starting Gateway"
    docker compose -f "$COMPOSE_FILE" up -d gateway

    print_status "Waiting for Gateway to become ready..."
    sleep 8  # Reduced from 15

    check_service_health "Gateway" "4000"

    # Start the frontend once the gateway is online
    print_header "Starting Frontend"
    docker compose -f "$COMPOSE_FILE" up -d frontend

    # Show status
    print_header "System Status"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(gateway|user-service|masterdata-service|accounting-service|templates-service|frontend|postgres)"

    # Show access information
    print_header "Access Information"
    echo ""
    echo -e "${GREEN}Frontend:${NC}        http://localhost:5173"
    echo -e "${GREEN}GraphQL Gateway:${NC} http://localhost:4000/graphql"
    echo -e "${GREEN}UserService:${NC}     http://localhost:5000/graphql"
    echo -e "${GREEN}TranslationService:${NC} http://localhost:8083/graphql"
    echo -e "${GREEN}TemplatesService:${NC} http://localhost:8087/api"
    echo -e "${GREEN}MinIO (Storage):${NC} http://localhost:9001 (admin/admin)"
    echo ""
    echo -e "${YELLOW}Login Credentials:${NC}"
    echo -e "  Email: admin@erp-system.local"
    echo -e "  Password: Admin123!"
    echo ""

    print_header "Startup Complete!"
    print_status "ERP System is now running locally"
    echo ""
    print_status "All core services are operational!"
    print_status "If you see 400 errors in the browser, clear localStorage and log in again"
}

# Function to stop the system
stop_system() {
    print_header "Stopping ERP System"

    cd "$PROJECT_DIR"

    print_status "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down

    print_status "System stopped"
}

# Function to show help
show_help() {
    echo "ERP System Local Startup Script"
    echo ""
    echo "Usage:"
    echo "  $0 start    - Start the ERP system"
    echo "  $0 stop     - Stop the ERP system"
    echo "  $0 status   - Show system status"
    echo "  $0 help     - Show this help"
    echo ""
    echo "The script will:"
    echo "  1. Check Docker availability"
    echo "  2. Start all databases"
    echo "  3. Wait for databases to be ready"
    echo "  4. Start core services (UserService, Gateway, Frontend)"
    echo "  5. Show access URLs and login credentials"
    echo ""
    echo "Note: Currently only UserService is active in GraphQL federation."
    echo "Other services need to be built and configured separately."
}

# Parse command line arguments
case "${1:-start}" in
    start)
        main
        ;;
    stop)
        stop_system
        ;;
    status)
        print_header "System Status"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(erp_system|minio)"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac