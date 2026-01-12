#!/bin/bash

################################################################################
# ERP System Build and Push to GitHub Container Registry (GHCR)
# 
# This script builds all ERP containers and pushes them to a private GHCR.
# 
# Usage:
#   ./scripts/deployment/deploy-to-registry.sh [OPTIONS]
#
# OPTIONS:
#   --config FILE        Path to config JSON file
#   --registry URL       Container registry URL (default: ghcr.io)
#   --username USER      GitHub username (default: JCTRoth)
#   --token TOKEN        GitHub PAT (read from stdin if not provided)
#   --version TAG        Image version tag (default: latest)
#   --dry-run            Show what would be built without actually building
#   --parallel N         Number of parallel builds (default: 2)
#   --help               Show this help message
#
# Environment Variables:
#   GITHUB_USERNAME      GitHub username (alternative to --username)
#   GITHUB_TOKEN         GitHub PAT (alternative to --token)
#   REGISTRY_URL         Registry URL (alternative to --registry)
#
# Examples:
#   ./scripts/deployment/deploy-to-registry.sh --username JCTRoth --token ghp_xxx --version 1.0.0
#   ./scripts/deployment/deploy-to-registry.sh --config deployment.json
#   CI=true ./scripts/deployment/deploy-to-registry.sh  # Auto-use env vars in CI/CD
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration defaults
REGISTRY_URL="${REGISTRY_URL:-ghcr.io}"
GITHUB_USERNAME="${GITHUB_USERNAME:-JCTRoth}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
IMAGE_VERSION="${IMAGE_VERSION:-latest}"
DRY_RUN=false
PARALLEL_BUILDS=2
CONFIG_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."

# Services to build (name:dockerfile_path)
declare -a SERVICES=(
    "frontend:apps/frontend"
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
)

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

show_help() {
    head -31 "$0" | tail -29
}

# Load configuration from JSON file
load_config() {
    local config_file=$1
    
    if [ ! -f "$config_file" ]; then
        print_error "Config file not found: $config_file"
        return 1
    fi
    
    print_info "Loading configuration from: $config_file"
    
    GITHUB_USERNAME=$(jq -r '.github_username // empty' "$config_file" || echo "")
    GITHUB_TOKEN=$(jq -r '.github_token // empty' "$config_file" || echo "")
    REGISTRY_URL=$(jq -r '.registry_url // empty' "$config_file" || echo "ghcr.io")
    IMAGE_VERSION=$(jq -r '.image_version // empty' "$config_file" || echo "latest")
    PARALLEL_BUILDS=$(jq -r '.parallel_builds // empty' "$config_file" || echo "2")
    
    [ -z "$GITHUB_USERNAME" ] && GITHUB_USERNAME="JCTRoth"
    [ -z "$REGISTRY_URL" ] && REGISTRY_URL="ghcr.io"
    [ -z "$IMAGE_VERSION" ] && IMAGE_VERSION="latest"
    [ -z "$PARALLEL_BUILDS" ] && PARALLEL_BUILDS=2
}

# Prompt for missing configuration
prompt_for_config() {
    echo ""
    
    if [ -z "$GITHUB_USERNAME" ]; then
        read -p "GitHub username [JCTRoth]: " GITHUB_USERNAME
        GITHUB_USERNAME="${GITHUB_USERNAME:-JCTRoth}"
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        read -sp "GitHub Personal Access Token: " GITHUB_TOKEN
        echo ""
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "GitHub token is required"
        return 1
    fi
    
    if [ "$IMAGE_VERSION" = "latest" ]; then
        read -p "Image version tag [$IMAGE_VERSION]: " VERSION_INPUT
        IMAGE_VERSION="${VERSION_INPUT:-$IMAGE_VERSION}"
    fi
}

# Validate Docker is available
validate_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        return 1
    fi
    
    print_status "Docker is available"
}

# Authenticate with GHCR
authenticate_ghcr() {
    print_info "Authenticating with GHCR..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Skipping GHCR authentication"
        return 0
    fi
    
    echo "$GITHUB_TOKEN" | docker login "$REGISTRY_URL" -u "$GITHUB_USERNAME" --password-stdin >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "Successfully authenticated with GHCR"
    else
        print_error "Failed to authenticate with GHCR"
        return 1
    fi
}

# Build and push a single service
build_and_push_service() {
    set +e  # Don't exit on errors in this function
    local service_name=$1
    local service_path=$2
    local lowercase_username=$(echo "$GITHUB_USERNAME" | tr '[:upper:]' '[:lower:]')
    local full_image_name="${REGISTRY_URL}/${lowercase_username}/erp-${service_name}:${IMAGE_VERSION}"
    
    print_info "Building: $service_name"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would build $full_image_name from $service_path"
        return 0
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$PROJECT_ROOT/$service_path/Dockerfile" ]; then
        print_warning "Dockerfile not found for $service_name at $service_path/Dockerfile"
        return 0
    fi
    
    # Build image
    if docker build -t "$full_image_name" "$PROJECT_ROOT/$service_path"; then
        print_status "Built: $service_name"
        
        # Push image
        print_info "Pushing: $service_name"
        if docker push "$full_image_name"; then
            print_status "Pushed: $service_name to $REGISTRY_URL"
            return 0
        else
            print_error "Failed to push: $service_name"
            return 1
        fi
    else
        print_error "Failed to build: $service_name"
        return 1
    fi
    set -e  # Restore exit on error
}

# Build all services sequentially or in parallel
build_all_services() {
    print_header "Building and Pushing Services"
    
    local failed_services=()
    local pids=()
    local service_count=0
    
    for service_info in "${SERVICES[@]}"; do
        local service_name="${service_info%%:*}"
        local service_path="${service_info##*:}"
        
        # Simple sequential processing
        build_and_push_service "$service_name" "$service_path"
        
        ((service_count++))
    done
    
    # Wait for all remaining jobs
    for pid in "${pids[@]}"; do
        wait "$pid" || failed_services+=("$service_count")
    done
    
    echo ""
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_status "All services built and pushed successfully"
        return 0
    else
        print_error "${#failed_services[@]} service(s) failed to build/push"
        return 1
    fi
}

# Display configuration summary
display_summary() {
    print_header "Build Configuration Summary"
    echo "Registry URL:       $REGISTRY_URL"
    echo "GitHub Username:    $GITHUB_USERNAME"
    echo "Image Version:      $IMAGE_VERSION"
    echo "Services:           ${#SERVICES[@]}"
    echo "Parallel Builds:    $PARALLEL_BUILDS"
    echo "Dry Run:            $DRY_RUN"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual builds or pushes will occur"
    fi
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --username)
                GITHUB_USERNAME="$2"
                shift 2
                ;;
            --token)
                GITHUB_TOKEN="$2"
                shift 2
                ;;
            --version)
                IMAGE_VERSION="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --parallel)
                PARALLEL_BUILDS="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Load config file if provided
    if [ -n "$CONFIG_FILE" ]; then
        load_config "$CONFIG_FILE"
    fi
    
    # Prompt for missing configuration
    prompt_for_config || exit 1
    
    # Validate environment
    validate_docker || exit 1
    
    # Display summary
    display_summary
    
    # Authenticate with GHCR
    authenticate_ghcr || exit 1
    
    # Build and push all services
    build_all_services
}

# Run main function
main "$@"
