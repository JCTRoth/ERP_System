#!/bin/bash
# Quick test suite for start-local.sh

SCRIPT="/home/jonas/Git/ERP_System/scripts/start-local.sh"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STARTUP SCRIPT QUICK TEST                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

pass=0
fail=0

test() {
    if eval "$1" > /dev/null 2>&1; then
        echo "✓ $2"
        ((pass++))
    else
        echo "✗ $2"
        ((fail++))
    fi
}

echo "=== BASIC CHECKS ==="
test "[ -f $SCRIPT ]" "Script exists"
test "[ -x $SCRIPT ]" "Script is executable"
test "bash -n $SCRIPT" "Valid bash syntax"

echo ""
echo "=== DOCKER ==="
test "docker info > /dev/null 2>&1" "Docker running"
test "[ -f /home/jonas/Git/ERP_System/docker-compose.dev.yml ]" "Compose file exists"

echo ""
echo "=== COMMANDS ==="
test "$SCRIPT help | grep -q 'ERP System'" "Help command"
test "$SCRIPT ports | grep -q 'Frontend'" "Ports command"
test "$SCRIPT status | grep -q 'System Status'" "Status command"

echo ""
echo "=== SERVICES RUNNING ==="
test "docker ps --format '{{.Names}}' | grep -q postgres" "PostgreSQL running"
test "docker ps --format '{{.Names}}' | grep -q user-service" "UserService running"

echo ""
echo "=== HEALTH CHECKS ==="
test "curl -sf http://localhost:5000/health > /dev/null 2>&1" "UserService /health endpoint"
test "curl -sf -X POST -H 'Content-Type: application/json' -d '{\"query\":\"{__typename}\"}' http://localhost:5000/graphql > /dev/null 2>&1" "UserService GraphQL endpoint"

echo ""
echo "=== SCRIPT STRUCTURE ==="
test "grep -q 'preflight_checks()' $SCRIPT" "preflight_checks function"
test "grep -q 'network_checks()' $SCRIPT" "network_checks function"
test "grep -q 'start_infrastructure()' $SCRIPT" "start_infrastructure function"
test "grep -q 'start_services()' $SCRIPT" "start_services function"
test "grep -q 'verify_services()' $SCRIPT" "verify_services function"
test "grep -q 'start_frontend()' $SCRIPT" "start_frontend function"
test "grep -q 'start_gateway()' $SCRIPT" "start_gateway function (CRITICAL)"
test "grep -q 'final_verification()' $SCRIPT" "final_verification function"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SUMMARY: $pass passed, $fail failed                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
