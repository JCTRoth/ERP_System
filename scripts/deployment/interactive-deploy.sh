#!/bin/bash

################################################################################
# ERP System Interactive Docker Deployment Script
# 
# This script interactively guides you through building and pushing ERP containers
# to the GitHub Container Registry with a custom version number.
#
# Usage: ./interactive-deploy.sh
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
REGISTRY_URL="ghcr.io"
GITHUB_USERNAME=""
GITHUB_TOKEN=""
IMAGE_VERSION=""
DRY_RUN=false

# Determine project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."

# Services to build (name:dockerfile_path)
declare -a SERVICES=(
    "frontend:$PROJECT_ROOT/apps/frontend"
    "gateway:$PROJECT_ROOT/apps/gateway"
    "user-service:$PROJECT_ROOT/apps/services/dotnet/UserService"
    "shop-service:$PROJECT_ROOT/apps/services/dotnet/ShopService"
    "accounting-service:$PROJECT_ROOT/apps/services/dotnet/AccountingService"
    "masterdata-service:$PROJECT_ROOT/apps/services/dotnet/MasterdataService"
    "orders-service:$PROJECT_ROOT/apps/services/dotnet/OrdersService"
    "company-service:$PROJECT_ROOT/apps/services/java/company-service"
    "translation-service:$PROJECT_ROOT/apps/services/java/translation-service"
    "notification-service:$PROJECT_ROOT/apps/services/java/notification-service"
    "scripting-service:$PROJECT_ROOT/apps/services/java/scripting-service"
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

# Validate Docker is available
validate_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        print_info "Please install Docker and ensure it's running"
        return 1
    fi
    
    print_status "Docker is available"
}

# Authenticate with GHCR
authenticate_ghcr() {
    print_info "Authenticating with GitHub Container Registry..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Skipping GHCR authentication"
        return 0
    fi
    
    echo "$GITHUB_TOKEN" | docker login "$REGISTRY_URL" -u "$GITHUB_USERNAME" --password-stdin >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "Successfully authenticated with GHCR"
    else
        print_error "Failed to authenticate with GHCR"
        print_info "Please check your GitHub username and token"
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
    if [ ! -f "$service_path/Dockerfile" ]; then
        print_warning "Dockerfile not found for $service_name at $service_path/Dockerfile"
        return 0
    fi
    
    # Build image
    if docker build -t "$full_image_name" "$service_path"; then
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

# Build all services
build_all_services() {
    print_header "Building and Pushing Services"
    
    local failed_services=()
    local success_count=0
    
    for service_info in "${SERVICES[@]}"; do
        local service_name="${service_info%%:*}"
        local service_path="${service_info##*:}"
        
        # Build and push service
        if build_and_push_service "$service_name" "$service_path"; then
            ((success_count++))
        else
            failed_services+=("$service_name")
        fi
        
        echo ""
    done
    
    # Summary
    echo ""
    print_header "Deployment Summary"
    echo "Successfully built and pushed: $success_count/${#SERVICES[@]} services"
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_status "All services built and pushed successfully!"
        return 0
    else
        print_warning "Failed to build/push the following services:"
        for service in "${failed_services[@]}"; do
            print_error "  - $service"
        done
        return 1
    fi
}

# Display configuration summary
display_summary() {
    print_header "Deployment Configuration"
    echo "Registry URL:       $REGISTRY_URL"
    echo "GitHub Username:    $GITHUB_USERNAME"
    echo "Image Version:      $IMAGE_VERSION"
    echo "Total Services:     ${#SERVICES[@]}"
    echo "Dry Run Mode:       $DRY_RUN"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual builds or pushes will occur"
    fi
}

# Interactive input collection
collect_inputs() {
    print_header "ERP System Docker Deployment"
    print_info "This script will build and push ERP containers to GitHub Container Registry"
    echo ""
    
    # GitHub Username
    while [ -z "$GITHUB_USERNAME" ]; do
        read -p "GitHub Username [JCTRoth]: " GITHUB_USERNAME
        GITHUB_USERNAME="${GITHUB_USERNAME:-JCTRoth}"
        
        if [ -z "$GITHUB_USERNAME" ]; then
            print_error "GitHub username cannot be empty"
        fi
    done
    
    # GitHub Token
    while [ -z "$GITHUB_TOKEN" ]; do
        read -sp "GitHub Personal Access Token (with write:packages scope): " GITHUB_TOKEN
        echo ""
        
        if [ -z "$GITHUB_TOKEN" ]; then
            print_error "GitHub token is required"
        else
            # Validate token format (should start with ghp_)
            if [[ ! "$GITHUB_TOKEN" =~ ^ghp_ ]]; then
                print_error "Invalid token format. GitHub tokens should start with 'ghp_'"
                GITHUB_TOKEN=""
            fi
        fi
    done
    
    # Image Version
    while [ -z "$IMAGE_VERSION" ]; do
        read -p "Image Version Tag (e.g., 1.1): " IMAGE_VERSION
        
        if [ -z "$IMAGE_VERSION" ]; then
            print_error "Version tag cannot be empty"
        fi
    done
    
    # Dry Run Option
    read -p "Run in dry-run mode? (y/N): " DRY_RUN_INPUT
    if [[ "$DRY_RUN_INPUT" =~ ^[Yy]$ ]]; then
        DRY_RUN=true
        print_warning "Dry run mode enabled - no actual builds or pushes will occur"
    else
        DRY_RUN=false
    fi
    
    echo ""
}

# Confirm before proceeding
confirm_deployment() {
    display_summary
    
    read -p "Continue with deployment? (Y/n): " CONFIRM
    
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        print_warning "Deployment cancelled by user"
        exit 0
    fi
    
    echo ""
}

# Main execution
main() {
    # Collect user inputs
    collect_inputs
    
    # Confirm deployment
    confirm_deployment
    
    # Validate environment
    validate_docker || exit 1
    
    # Authenticate with GHCR
    authenticate_ghcr || exit 1
    
    # Build and push all services
    build_all_services
}

# Run main function
main "$@"
