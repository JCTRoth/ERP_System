#!/usr/bin/env bash
# Stop and remove ERP System Docker containers safely
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

# Function to print colored output
print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

print_header() {
    echo -e "\033[0;34m================================\033[0m"
    echo -e "\033[0;34m$1\033[0m"
    echo -e "\033[0;34m================================\033[0m"
}

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

print_header "Stopping ERP System"

cd "$PROJECT_DIR"

print_status "Stopping all ERP System services..."
docker compose -f "$COMPOSE_FILE" down

print_status "ERP System stopped successfully"

# Optional: Also clean up any orphaned containers from this project
print_status "Cleaning up any orphaned containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

print_status "Cleanup complete"