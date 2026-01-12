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

# Load configuration from config.json if it exists
CONFIG_FILE="$PROJECT_DIR/scripts/deployment/config.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "Loading configuration from $CONFIG_FILE"
    DEPLOY_SERVER=$(jq -r '.deploy_server // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    DEPLOY_DOMAIN=$(jq -r '.deploy_domain // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    DEPLOY_USERNAME=$(jq -r '.deploy_username // empty' "$CONFIG_FILE" 2>/dev/null || echo "root")
    DEPLOY_PORT=$(jq -r '.deploy_port // empty' "$CONFIG_FILE" 2>/dev/null || echo "22")
    DEPLOY_SSH_KEY=$(jq -r '.deploy_ssh_key // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    REGISTRY_URL=$(jq -r '.registry_url // empty' "$CONFIG_FILE" 2>/dev/null || echo "ghcr.io")
    REGISTRY_USERNAME=$(jq -r '.registry_username // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    REGISTRY_TOKEN=$(jq -r '.registry_token // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    IMAGE_VERSION=$(jq -r '.image_version // empty' "$CONFIG_FILE" 2>/dev/null || echo "latest")
    LETSENCRYPT_EMAIL=$(jq -r '.letsencrypt_email // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    DB_PASSWORD=$(jq -r '.db_password // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    SUDO_PASSWORD=$(jq -r '.sudo_password // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    
    # Expand tilde in SSH key path
    DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"
    [ -z "$DEPLOY_SSH_KEY" ] && DEPLOY_SSH_KEY="$HOME/.ssh/id_rsa"
fi

# Mode: remote (use published images) or local (build from source)
MODE="local"

# Deployment target: local or remote
TARGET="local"

# Helper to run docker compose with selected mode
dc() {
    # Usage: dc [docker-compose-args...]
    if [ "$TARGET" = "remote" ]; then
        # For remote deployment, execute on server
        local cmd="cd /opt/erp-system && docker compose --env-file .env"
        if [ "$MODE" = "local" ]; then
            cmd="$cmd -f docker-compose.yml -f docker-compose.prod-local.yml"
        else
            cmd="$cmd -f docker-compose.yml"
        fi
        cmd="$cmd $@"
        ssh_exec "$cmd"
    else
        # Local execution
        if [ "$MODE" = "local" ]; then
            docker compose -f "$COMPOSE_FILE_REMOTE" -f "$COMPOSE_FILE_LOCAL" "$@"
        else
            docker compose -f "$COMPOSE_FILE_REMOTE" "$@"
        fi
    fi
}

# SSH execution helper for remote deployment
ssh_exec() {
    local command=$1
    
    if [ "$TARGET" = "remote" ]; then
        ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" -o StrictHostKeyChecking=accept-new \
            "$DEPLOY_USERNAME@$DEPLOY_SERVER" "$command"
    else
        eval "$command"
    fi
}

# SCP helper for remote deployment
scp_to_server() {
    local source=$1
    local dest=$2
    
    if [ "$TARGET" = "remote" ]; then
        scp -i "$DEPLOY_SSH_KEY" -P "$DEPLOY_PORT" "$source" "$DEPLOY_USERNAME@$DEPLOY_SERVER:$dest"
    else
        cp "$source" "$dest"
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
    unhealthy_count=$(dc ps | grep -c "unhealthy\|exited")

    if [ "$unhealthy_count" -gt 0 ]; then
        print_warning "Some containers are unhealthy or exited:"
        dc ps | grep -E "(unhealthy|exited)"
    else
        print_status "All containers are healthy"
    fi

    # Verify MinIO is running and healthy (required)
    if dc ps | grep -q "erp-minio.*Up.*(healthy)"; then
        print_status "MinIO is running and healthy (file storage available)"
    else
        print_error "MinIO is not healthy or not running. File storage is required for production simulation."
        dc logs minio --tail 50
        exit 1
    fi

    # Test gateway health
    print_info "Testing gateway health..."
    if [ "$TARGET" = "remote" ]; then
        # Test remote gateway
        if ssh_exec "curl -f -s http://localhost:4000/health >/dev/null 2>&1"; then
            print_status "Gateway health check passed"
        else
            print_warning "Gateway health check failed - it may still be initializing"
        fi
    else
        # Test local gateway
        if curl -f -s http://localhost:4000/health >/dev/null 2>&1; then
            print_status "Gateway health check passed"
        else
            print_warning "Gateway health check failed - it may still be initializing"
        fi
    fi

    # Test frontend
    print_info "Testing frontend availability..."
    if [ "$TARGET" = "remote" ]; then
        # Test remote frontend
        if ssh_exec "curl -f -s http://localhost:5173 >/dev/null 2>&1"; then
            print_status "Frontend is accessible"
        else
            print_warning "Frontend is not yet accessible"
        fi
    else
        # Test local frontend
        if curl -f -s http://localhost:5173 >/dev/null 2>&1; then
            print_status "Frontend is accessible"
        else
            print_warning "Frontend is not yet accessible"
        fi
    fi
}

# ============================================================================
# REMOTE DEPLOYMENT FUNCTIONS
# ============================================================================

remote_preflight_checks() {
    print_header "PHASE 1: Remote Pre-flight Checks"

    # Check required configuration
    if [ -z "$DEPLOY_SERVER" ] || [ -z "$DEPLOY_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
        print_error "Missing required configuration. Please check config.json"
        print_info "Required: deploy_server, deploy_username, db_password"
        exit 1
    fi
    print_status "Configuration loaded"

    # Check SSH connectivity
    print_info "Testing SSH connection to $DEPLOY_SERVER..."
    if ! ssh -i "$DEPLOY_SSH_KEY" -p "$DEPLOY_PORT" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
        "$DEPLOY_USERNAME@$DEPLOY_SERVER" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        print_error "Cannot connect to $DEPLOY_SERVER via SSH"
        exit 1
    fi
    print_status "SSH connection successful"

    # Check Docker on remote server
    print_info "Checking Docker on remote server..."
    if ! ssh_exec "docker info >/dev/null 2>&1"; then
        print_error "Docker is not running on remote server"
        exit 1
    fi
    print_status "Docker is available on remote server"
}

prepare_remote_deployment() {
    print_header "PHASE 2: Preparing Remote Deployment"

    # Create remote directories
    print_info "Creating remote directories..."
    ssh_exec "mkdir -p /opt/erp-system /opt/erp-system/nginx/conf.d /var/www/certbot"
    
    # Configure firewall
    print_info "Configuring firewall..."
    ssh_exec "echo '$SUDO_PASSWORD' | sudo -S ufw status | head -5 || echo 'UFW not active'"
    ssh_exec "echo '$SUDO_PASSWORD' | sudo -S ufw allow 8088/tcp comment 'ERP Frontend' || echo 'Failed to allow 8088'"
    ssh_exec "echo '$SUDO_PASSWORD' | sudo -S ufw allow 4000/tcp comment 'ERP Gateway' || echo 'Failed to allow 4000'"
    ssh_exec "echo '$SUDO_PASSWORD' | sudo -S ufw allow 9000/tcp comment 'MinIO' || echo 'Failed to allow 9000'"
    ssh_exec "echo '$SUDO_PASSWORD' | sudo -S ufw reload || echo 'Failed to reload UFW'"
    
    # Create .env file on remote server
    print_info "Creating environment configuration..."
    local env_file="/tmp/.env.production"
    cat > "$env_file" << EOF
DB_PASSWORD=$DB_PASSWORD
REGISTRY_URL=$REGISTRY_URL
REGISTRY_USERNAME=$REGISTRY_USERNAME
IMAGE_VERSION=$IMAGE_VERSION
DEPLOY_DOMAIN=$DEPLOY_DOMAIN
EOF
    scp_to_server "$env_file" "/opt/erp-system/.env"
    rm -f "$env_file"
    
    # Copy docker-compose files
    print_info "Copying docker-compose files..."
    scp_to_server "$COMPOSE_FILE_REMOTE" "/opt/erp-system/docker-compose.yml"
    if [ "$MODE" = "local" ]; then
        scp_to_server "$COMPOSE_FILE_LOCAL" "/opt/erp-system/docker-compose.prod-local.yml"
    fi
    
    # Copy nginx configuration
    print_info "Copying nginx configuration..."
    scp_to_server "$PROJECT_DIR/infrastructure/nginx/nginx.conf" "/opt/erp-system/nginx/"
    scp_to_server "$PROJECT_DIR/infrastructure/nginx/conf.d/default.conf" "/opt/erp-system/nginx/conf.d/"
    
    # Login to registry on remote server
    if [ "$MODE" = "remote" ] && [ -n "$REGISTRY_TOKEN" ]; then
        print_info "Authenticating with container registry..."
        ssh_exec "echo '$REGISTRY_TOKEN' | docker login $REGISTRY_URL -u $REGISTRY_USERNAME --password-stdin"
    fi
}

deploy_to_remote() {
    print_header "PHASE 3: Deploying to Remote Server"

    # Pull images if using remote mode
    if [ "$MODE" = "remote" ]; then
        print_info "Pulling container images..."
        dc pull
        # Force pull gateway image to ensure latest version
        dc pull gateway
    fi

    # Start services
    print_info "Starting services..."
    dc up -d postgres
    
    # Wait for postgres
    print_info "Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if ssh_exec "docker exec erp-postgres pg_isready -U postgres >/dev/null 2>&1"; then
            print_status "PostgreSQL is ready"
            break
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Start all other services
    dc up -d
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

show_status() {
    print_header "ERP System $([ "$TARGET" = "remote" ] && echo "Remote" || echo "Local") Production Status"

    echo ""
    print_info "Running containers:"
    dc ps

    echo ""
    print_info "Access URLs:"
    if [ "$TARGET" = "remote" ]; then
        echo "  Frontend:    https://$DEPLOY_DOMAIN"
        echo "  Gateway:     https://$DEPLOY_DOMAIN/graphql"
        echo "  Health:      https://$DEPLOY_DOMAIN/health"
        echo "  Server:      $DEPLOY_SERVER"
    else
        echo "  Frontend:    http://localhost:5173"
        echo "  Gateway:     http://localhost:4000/graphql"
        echo "  Health:      http://localhost:4000/health"
        echo "  Metrics:     http://localhost:4000/metrics"
        echo "  PostgreSQL:  localhost:15432 (postgres/postgres)"
    fi

    echo ""
    if [ "$TARGET" = "remote" ]; then
        print_info "To view logs: ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose logs -f'"
        print_info "To stop:      ssh $DEPLOY_USERNAME@$DEPLOY_SERVER 'cd /opt/erp-system && docker compose down'"
        print_info "To restart:   $0 restart remote"
    else
        print_info "To view logs: use the script with 'logs' or 'status' (mode-aware)"
        print_info "To stop:      $0 stop [mode]"
        print_info "To restart:   $0 restart [mode]"
    fi
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
    # Parse arguments: cmd target mode
    TARGET="${2:-local}"
    MODE="${3:-local}"
    
    # For remote target, default to remote mode (GitHub images)
    if [ "$TARGET" = "remote" ]; then
        MODE="${MODE:-remote}"
    fi
    echo "DEBUG: cmd=$cmd, TARGET=$TARGET, MODE=$MODE"

    case "$cmd" in
        start)
            if [ "$TARGET" = "remote" ]; then
                print_header "🚀 Deploying ERP System to Remote Server"
                echo "Server: $DEPLOY_SERVER"
                echo "Domain: $DEPLOY_DOMAIN"
                echo "Mode: $MODE (using $([ "$MODE" = "remote" ] && echo "GitHub images" || echo "local builds"))"
                echo "Estimated time: 10-15 minutes"
                echo ""
                
                remote_preflight_checks
                prepare_remote_deployment
                build_images
                deploy_to_remote
                verify_deployment
            else
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
            fi

            print_header "🎉 $([ "$TARGET" = "remote" ] && echo "Deployment" || echo "Production Simulation") Started Successfully!"
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
            echo "Usage: $0 [command] [target] [mode]"
            echo ""
            echo "Commands:"
            echo "  start    - Start the production system (default)"
            echo "  stop     - Stop all services"
            echo "  status   - Show current status"
            echo "  restart  - Restart all services"
            echo "  logs     - Show logs (optionally specify service name)"
            echo "  cleanup  - Stop services and remove containers/volumes/images"
            echo ""
            echo "Targets:"
            echo "  local    - Run locally on this machine (default)"
            echo "  remote   - Deploy to remote server using config.json"
            echo ""
            echo "Modes:"
            echo "  local    - Build images from source (default)"
            echo "  remote   - Use published images from GitHub Container Registry"
            echo ""
            echo "Examples:"
            echo "  $0 start                           # Local production simulation with local builds"
            echo "  $0 start remote remote             # Deploy to remote server using GitHub images"
            echo "  $0 start local remote              # Local deployment using GitHub images"
            echo "  $0 logs gateway"
            echo "  $0 stop"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"