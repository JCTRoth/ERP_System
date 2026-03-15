#!/bin/bash

# Build All Projects Script for ERP System
# This script builds all microservices and the frontend
# Supports: Nx projects (frontend, gateway), .NET services, Java services, and Node.js services

# Don't use set -e as it can cause issues with success checking in conditional statements

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_BUILDS=0
SUCCESSFUL_BUILDS=0
FAILED_BUILDS=0
FAILED_PROJECTS=()

log_start() {
    echo -e "${BLUE}▶ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to build and track results
build_project() {
    local project_name=$1
    local build_command=$2
    local project_path=$3
    
    ((TOTAL_BUILDS++))
    
    log_start "Building $project_name..."
    
    if (cd "$project_path" && eval "$build_command"); then
        log_success "$project_name built successfully"
        ((SUCCESSFUL_BUILDS++))
    else
        log_error "$project_name build failed"
        ((FAILED_BUILDS++))
        FAILED_PROJECTS+=("$project_name")
    fi
    
    echo ""
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ERP System - Build All Projects${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# 1. Build Nx projects (Frontend and Gateway)
log_start "Building Nx projects (Frontend, Gateway, Libraries)..."
if npm run build; then
    log_success "Nx projects built successfully"
    ((SUCCESSFUL_BUILDS++))
else
    log_error "Nx projects build failed"
    ((FAILED_BUILDS++))
    FAILED_PROJECTS+=("Nx projects")
fi
((TOTAL_BUILDS++))
echo ""

# 2. Build .NET services
log_start "Building .NET services..."
if dotnet build ERP_System.sln; then
    log_success ".NET services built successfully"
    ((SUCCESSFUL_BUILDS++))
else
    log_error ".NET services build failed"
    ((FAILED_BUILDS++))
    FAILED_PROJECTS+=(".NET services")
fi
((TOTAL_BUILDS++))
echo ""

# 3. Build Java services
log_start "Building Java services..."

JAVA_SERVICES=(
    "company-service"
    "notification-service"
    "translation-service"
    "scripting-service"
    "edifact-service"
)

for service in "${JAVA_SERVICES[@]}"; do
    service_path="$PROJECT_ROOT/apps/services/java/$service"
    if [ -d "$service_path" ]; then
        build_project "$service" "./gradlew build" "$service_path"
    else
        log_warning "Java service $service not found at $service_path"
    fi
done

# 4. Install dependencies for Node.js services
log_start "Installing dependencies for Node.js services..."

# npm installs can fail when node_modules contains leftover files or directories.
# We try a normal install first, and if it fails, we remove node_modules and retry.
install_node_deps() {
    local project_path="$1"
    local install_cmd="npm ci"

    # Prefer npm ci if lockfile exists, otherwise fall back to npm install
    if [ ! -f "$project_path/package-lock.json" ]; then
        install_cmd="npm install"
    fi

    if (cd "$project_path" && $install_cmd); then
        return 0
    fi

    # Retry after cleaning node_modules
    echo "${YELLOW}Retrying after cleaning node_modules...${NC}"
    rm -rf "$project_path/node_modules"
    if (cd "$project_path" && $install_cmd); then
        return 0
    fi

    return 1
}

NODE_SERVICES=(
    "apps/services/nodejs/templates-service"
)

for service_path in "${NODE_SERVICES[@]}"; do
    full_path="$PROJECT_ROOT/$service_path"
    if [ -d "$full_path" ]; then
        service_name=$(basename "$full_path")
        if install_node_deps "$full_path"; then
            log_success "$service_name dependencies installed successfully"
            ((SUCCESSFUL_BUILDS++))
        else
            log_error "$service_name dependencies installation failed"
            ((FAILED_BUILDS++))
            FAILED_PROJECTS+=("$service_name")
        fi
        ((TOTAL_BUILDS++))
        echo ""
    fi
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Build Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total builds: $TOTAL_BUILDS"
echo -e "${GREEN}Successful: $SUCCESSFUL_BUILDS${NC}"
echo -e "${RED}Failed: $FAILED_BUILDS${NC}"

if [ $FAILED_BUILDS -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed projects:${NC}"
    for project in "${FAILED_PROJECTS[@]}"; do
        echo "  - $project"
    done
    echo ""
    exit 1
else
    echo ""
    log_success "All projects built successfully!"
    exit 0
fi
