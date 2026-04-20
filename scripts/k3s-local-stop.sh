#!/usr/bin/env bash
# K3s deployment stop script for ERP System
# Gracefully stops services, port-forwards, and optionally removes resources
# Usage: ./scripts/k3s-local-stop.sh [action]
# Actions: stop (default), pause, clean

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="erp"
RELEASE_NAME="erp-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "\n${GREEN}==>${NC} $*"; }

# Stop port-forwards
stop_portforwards() {
    log_step "Stopping port-forwards..."
    
    if pkill -f "kubectl port-forward" 2>/dev/null; then
        sleep 1
        log_info "✓ Port-forwards stopped"
    else
        log_info "✓ No active port-forwards found"
    fi
}

# Pause: Stop Helm release but keep data
pause_deployment() {
    log_step "Pausing deployment (keeping PostgreSQL data)..."
    
    if helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" 2>/dev/null; then
        log_info "✓ Helm release stopped"
        sleep 2
        
        # Check if any pods are still running
        RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo 0)
        if [ "$RUNNING" -gt 0 ]; then
            log_warn "Waiting for pods to terminate..."
            sleep 5
        fi
    else
        log_warn "Helm release not found or already removed"
    fi
    
    log_info "✓ Deployment paused"
    log_info "  PostgreSQL data: PRESERVED"
    log_info "  To resume: bash scripts/k3s-local-deploy.sh deploy"
}

# Full cleanup: Remove namespace and all data
full_cleanup() {
    log_step "Full cleanup (removing all resources and data)..."
    
    read -p "This will DELETE all ERP System resources and PostgreSQL data. Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_warn "Cleanup cancelled"
        return 0
    fi
    
    log_warn "Removing namespace: $NAMESPACE..."
    
    if kubectl delete namespace "$NAMESPACE" --ignore-not-found 2>/dev/null; then
        log_info "✓ Namespace deletion initiated"
        
        log_info "Waiting for namespace to be deleted (this may take a minute)..."
        kubectl wait --for=delete namespace/"$NAMESPACE" --timeout=120s 2>/dev/null || true
        
        log_info "✓ Full cleanup complete"
        log_info "  All resources deleted"
        log_info "  PostgreSQL data deleted"
        log_info "  To redeploy: bash scripts/k3s-local-deploy.sh full"
    else
        log_error "Failed to delete namespace"
        exit 1
    fi
}

# Show status
show_status() {
    log_step "Checking status..."
    
    echo ""
    ACTIVE=$(pgrep -fc "kubectl port-forward" 2>/dev/null || true)
    ACTIVE=${ACTIVE:-0}
    if [ "$ACTIVE" -gt 0 ]; then
        echo "Active port-forwards: $ACTIVE"
        ps aux 2>/dev/null | grep "kubectl port-forward" | grep -v grep || true
    else
        echo "No active port-forwards"
    fi
    
    echo ""
    PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || true)
    PODS=$(echo "$PODS" | tr -d '[:space:]')
    PODS=${PODS:-0}
    if [ "$PODS" -gt 0 ]; then
        echo "Running pods in $NAMESPACE: $PODS"
        kubectl get pods -n "$NAMESPACE" 2>/dev/null | head -5 || true
    else
        echo "No pods in $NAMESPACE"
    fi
    
    echo ""
    echo "PostgreSQL data: $(kubectl get pvc -n "$NAMESPACE" 2>/dev/null | grep -c 'pgdata' || echo '0') volumes"
}

# Main logic
main() {
    local action="${1:-stop}"
    
    case "$action" in
        stop)
            log_step "Stopping ERP System (keeping services paused)..."
            stop_portforwards
            log_info ""
            log_info "Services paused. PostgreSQL data preserved."
            log_info "To resume: bash scripts/k3s-local-deploy.sh deploy"
            log_info "Or restart port-forwards: bash scripts/k3s-local-deploy.sh portforward"
            ;;
        pause)
            stop_portforwards
            pause_deployment
            log_info ""
            log_info "All services and port-forwards stopped"
            log_info "PostgreSQL data: PRESERVED"
            log_info "To resume: bash scripts/k3s-local-deploy.sh deploy"
            ;;
        clean)
            if full_cleanup; then
                stop_portforwards
            fi
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {stop|pause|clean|status}"
            echo ""
            echo "Actions:"
            echo "  stop   - Stop port-forwards only (keep Helm release active)"
            echo "  pause  - Stop port-forwards and Helm release (keep PostgreSQL data)"
            echo "  clean  - Full cleanup (remove everything including data)"
            echo "  status - Show current status"
            exit 1
            ;;
    esac
}

main "$@"
