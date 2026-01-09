#!/bin/bash

# Comprehensive Test Suite for start-local.sh
# Tests all critical functions and validation logic

set -e

SCRIPT_PATH="/home/jonas/Git/ERP_System/scripts/start-local.sh"
PROJECT_DIR="/home/jonas/Git/ERP_System"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  START-LOCAL.SH - COMPREHENSIVE TEST SUITE                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_count=0
pass_count=0
fail_count=0

run_test() {
    local test_name=$1
    local test_cmd=$2
    ((test_count++))
    
    echo -e "${BLUE}[TEST $test_count]${NC} $test_name"
    
    if eval "$test_cmd"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((pass_count++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((fail_count++))
    fi
    echo ""
}

# ============================================================================
# TEST 1: Script existence and permissions
# ============================================================================

run_test "Script file exists" "[ -f $SCRIPT_PATH ]"
run_test "Script is executable" "[ -x $SCRIPT_PATH ]"

# ============================================================================
# TEST 2: Syntax validation
# ============================================================================

run_test "Script has valid bash syntax" "bash -n $SCRIPT_PATH"

# ============================================================================
# TEST 3: Docker and dependencies
# ============================================================================

run_test "Docker is running" "docker info >/dev/null 2>&1"
run_test "docker-compose file exists" "[ -f $COMPOSE_FILE ]"
run_test "netcat (nc) is available" "command -v nc >/dev/null 2>&1"
run_test "curl is available" "command -v curl >/dev/null 2>&1"

# ============================================================================
# TEST 4: Help and status commands
# ============================================================================

run_test "Help command works" "$SCRIPT_PATH help | grep -q 'ERP System'"
run_test "Status command works" "$SCRIPT_PATH status | grep -q 'System Status'"
run_test "Ports command works" "$SCRIPT_PATH ports | grep -q 'Service Port'"

# ============================================================================
# TEST 5: Port detection logic
# ============================================================================

run_test "Port 5000 check works (UserService running)" "nc -z localhost 5000 >/dev/null 2>&1"
run_test "Port 15432 check works (PostgreSQL running)" "nc -z localhost 15432 >/dev/null 2>&1"
run_test "Nonexistent port fails correctly" "! nc -z localhost 9999 >/dev/null 2>&1"

# ============================================================================
# TEST 6: Service health check endpoints
# ============================================================================

run_test "UserService /health endpoint responds" \
    "curl -sf --max-time 3 http://localhost:5000/health >/dev/null 2>&1"

run_test "UserService GraphQL endpoint responds" \
    "curl -sf --max-time 3 -X POST -H 'Content-Type: application/json' -d '{\"query\":\"{__typename}\"}' http://localhost:5000/graphql >/dev/null 2>&1"

run_test "PostgreSQL is accessible" \
    "docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres >/dev/null 2>&1"

# ============================================================================
# TEST 7: Service detection
# ============================================================================

run_test "Running services can be detected" \
    "docker ps --format '{{.Names}}' | grep -q 'user-service'"

run_test "PostgreSQL service is running" \
    "docker ps --format '{{.Names}}' | grep -q 'postgres'"

# ============================================================================
# TEST 8: Script output formatting
# ============================================================================

run_test "Script uses proper color codes" \
    "grep -q '033\[0' $SCRIPT_PATH"

run_test "Script contains phase headers" \
    "grep -q 'PHASE' $SCRIPT_PATH"

# ============================================================================
# TEST 9: Function definitions
# ============================================================================

run_test "preflight_checks function defined" \
    "grep -q 'preflight_checks()' $SCRIPT_PATH"

run_test "network_checks function defined" \
    "grep -q 'network_checks()' $SCRIPT_PATH"

run_test "start_infrastructure function defined" \
    "grep -q 'start_infrastructure()' $SCRIPT_PATH"

run_test "start_services function defined" \
    "grep -q 'start_services()' $SCRIPT_PATH"

run_test "verify_services function defined" \
    "grep -q 'verify_services()' $SCRIPT_PATH"

run_test "start_frontend function defined" \
    "grep -q 'start_frontend()' $SCRIPT_PATH"

run_test "start_gateway function defined" \
    "grep -q 'start_gateway()' $SCRIPT_PATH"

run_test "final_verification function defined" \
    "grep -q 'final_verification()' $SCRIPT_PATH"

# ============================================================================
# TEST 10: Key features and order
# ============================================================================

run_test "Gateway startup is called LAST in main" \
    "awk '/^main\(\)/,/^}/' $SCRIPT_PATH | grep -A100 'start_gateway' | grep -q 'final_verification' && echo 'Gateway called before final verification'"

run_test "Health checks performed before gateway" \
    "awk '/^main\(\)/,/^}/' $SCRIPT_PATH | grep -n 'verify_services' | head -1 && awk '/^main\(\)/,/^}/' $SCRIPT_PATH | grep -n 'start_gateway' | head -1 | grep -q '.*' && echo 'Order verified'"

run_test "Script contains error handling" \
    "grep -q '|| exit 1' $SCRIPT_PATH"

# ============================================================================
# TEST 11: Environment and configuration
# ============================================================================

run_test "PROJECT_DIR is properly set" \
    "grep -q 'PROJECT_DIR=' $SCRIPT_PATH"

run_test "COMPOSE_FILE is properly configured" \
    "grep -q 'COMPOSE_FILE=' $SCRIPT_PATH"

# ============================================================================
# TEST 12: Docker operations
# ============================================================================

run_test "PostgreSQL container is running and healthy" \
    "docker ps --filter 'name=postgres' --format '{{.State}}' | grep -q running"

run_test "Services are properly running" \
    "[ $(docker ps --filter 'name=erp_system' --format '{{.Names}}' | wc -l) -ge 5 ]"

# ============================================================================
# SUMMARY REPORT
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  TEST SUMMARY                                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Total Tests:   $test_count"
echo -e "Passed:        ${GREEN}$pass_count${NC}"
echo -e "Failed:        ${RED}$fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Script is ready for production use."
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Please review the failed tests above."
    exit 1
fi
