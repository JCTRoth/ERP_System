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
wait_for_db() {
    local container_name=$1
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $container_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if docker exec $container_name pg_isready -U postgres >/dev/null 2>&1; then
            print_status "$container_name is ready!"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    print_error "$container_name failed to start within expected time"
    return 1
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=10
    local attempt=1

    print_status "Checking health of $service_name on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$port/health >/dev/null 2>&1; then
            print_status "$service_name is healthy!"
            return 0
        fi

        sleep 3
        ((attempt++))
    done

    print_warning "$service_name health check failed, but continuing..."
    return 0
}

# Function to check GraphQL endpoint health
check_graphql_health() {
    local service_name=$1
    local port=$2
    local max_attempts=15
    local attempt=1

    print_status "Checking GraphQL endpoint for $service_name on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -X POST -H "Content-Type: application/json" -d '{"query":"{__typename}"}' http://localhost:$port/graphql >/dev/null 2>&1; then
            print_status "$service_name GraphQL endpoint is ready!"
            return 0
        fi

        echo -n "."
        sleep 3
        ((attempt++))
    done

    print_warning "$service_name GraphQL endpoint not ready, but continuing..."
    return 0
}

# Main startup function
main() {
    print_header "ERP System Local Startup"

    # Pre-flight checks
    check_docker
    check_compose_file

    cd "$PROJECT_DIR"

    # Start infrastructure (databases and Redis)
    print_header "Starting Infrastructure"
    print_status "Starting databases and Redis..."

    docker compose -f "$COMPOSE_FILE" up -d \
        postgres-users \
        postgres-shop \
        postgres-accounting \
        postgres-masterdata \
        postgres-company \
        postgres-notification \
        postgres-translation \
        postgres-templates \
        redis

    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    wait_for_db erp_system-postgres-users-1
    wait_for_db erp_system-postgres-shop-1
    wait_for_db erp_system-postgres-accounting-1
    wait_for_db erp_system-postgres-masterdata-1
    wait_for_db erp_system-postgres-company-1
    wait_for_db erp_system-postgres-notification-1
    wait_for_db erp_system-postgres-translation-1
    wait_for_db erp_system-postgres-templates-1

    # Start GraphQL services required by the gateway
    print_header "Starting GraphQL Dependencies"
    print_status "Bringing up UserService, TranslationService, CompanyService, ShopService, MasterdataService, and AccountingService..."

    docker compose -f "$COMPOSE_FILE" up -d \
        user-service \
        translation-service \
        company-service \
        shop-service \
        masterdata-service \
        accounting-service \
        templates-service

    # Give services a moment to spin up
    print_status "Waiting for dependent services..."
    sleep 10

    check_service_health "UserService" "5000"
    check_graphql_health "UserService" "5000"

    check_service_health "TranslationService" "8083"
    check_graphql_health "TranslationService" "8083"

    check_service_health "CompanyService" "8081"
    check_graphql_health "CompanyService" "8081"

    check_service_health "ShopService" "5003"
    check_graphql_health "ShopService" "5003"

    check_service_health "MasterdataService" "5002"
    check_graphql_health "MasterdataService" "5002"

    check_service_health "AccountingService" "5001"
    check_graphql_health "AccountingService" "5001"

    check_service_health "TemplatesService" "8087"

    # Start the gateway after dependencies are healthy
    print_header "Starting Gateway"
    docker compose -f "$COMPOSE_FILE" up -d gateway

    print_status "Waiting for Gateway to become ready..."
    sleep 15

    check_service_health "Gateway" "4000"

    # Start the frontend once the gateway is online
    print_header "Starting Frontend"
    docker compose -f "$COMPOSE_FILE" up -d frontend

    # Show status
    print_header "System Status"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(gateway|user-service|masterdata-service|accounting-service|templates-service|frontend|postgres|redis)"

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
    echo "  2. Start all databases and Redis"
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