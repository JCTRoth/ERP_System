#!/usr/bin/env bash
# Comprehensive Federation and Service Integration Tests
# Tests all services individually and through the Apollo Gateway

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
LOG_DIR="${LOG_DIR:-./test-logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Create log directory
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/federation-test-$TIMESTAMP.log"

# Service URLs
declare -A SERVICE_URLS=(
    ["user-service"]="http://localhost:5000"
    ["shop-service"]="http://localhost:5003"
    ["accounting-service"]="http://localhost:5001"
    ["masterdata-service"]="http://localhost:5002"
    ["orders-service"]="http://localhost:5004"
    ["company-service"]="http://localhost:8080"
    ["translation-service"]="http://localhost:8081"
)

# Helper functions
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

print_header() {
    log "\n${BLUE}========================================${NC}"
    log "${BLUE}$1${NC}"
    log "${BLUE}========================================${NC}\n"
}

print_success() {
    log "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    log "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_skip() {
    log "${YELLOW}⊘ $1${NC}"
    ((TESTS_SKIPPED++))
}

# Test if service is responsive
test_service_health() {
    local service=$1
    local url=$2
    
    log "Checking $service..."
    
    # Try multiple endpoints
    for endpoint in "/health" "/graphql" ""; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url$endpoint" 2>&1 || echo "000")
        if [[ "$response" =~ ^[2-4][0-9][0-9]$ ]]; then
            print_success "$service is responsive (HTTP $response at $endpoint)"
            return 0
        fi
    done
    
    print_error "$service is not responsive at $url"
    return 1
}

# Test GraphQL endpoint
test_graphql_query() {
    local service=$1
    local url=$2
    local query=$3
    local description=$4
    
    log "Testing $service - $description..."
    
    response=$(curl -s -X POST "$url/graphql" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}" 2>&1 || echo '{"errors":[{"message":"Connection failed"}]}')
    
    # Check for errors
    if echo "$response" | grep -q '"errors"'; then
        error_msg=$(echo "$response" | jq -r '.errors[0].message' 2>/dev/null || echo "$response")
        print_error "$service - $description: $error_msg"
        echo "$response" >> "$LOG_FILE"
        return 1
    fi
    
    # Check for data
    if echo "$response" | grep -q '"data"'; then
        print_success "$service - $description"
        return 0
    fi
    
    print_error "$service - $description: No data in response"
    echo "$response" >> "$LOG_FILE"
    return 1
}

# Check service logs for errors
check_service_logs() {
    local service=$1
    
    log "Checking $service logs for errors..."
    
    if ! docker compose ps "$service" &>/dev/null; then
        print_skip "$service logs (service not in compose)"
        return 0
    fi
    
    # Get last 50 lines of logs
    logs=$(docker compose logs "$service" --tail=50 2>&1 || echo "")
    
    # Count errors and warnings
    error_count=$(echo "$logs" | grep -i "error\|exception\|fatal" | grep -v "0 Error" | wc -l)
    warning_count=$(echo "$logs" | grep -i "warning" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        print_error "$service has $error_count errors in logs"
        echo "$logs" | grep -i "error\|exception\|fatal" | head -10 >> "$LOG_FILE"
        return 1
    elif [ "$warning_count" -gt 5 ]; then
        log "${YELLOW}⚠ $service has $warning_count warnings in logs${NC}"
    else
        print_success "$service logs clean (no critical errors)"
    fi
    
    return 0
}

# Main test execution
print_header "Federation and Service Integration Tests"
log "Timestamp: $TIMESTAMP"
log "Log file: $LOG_FILE"

# Phase 1: Service Health Checks
print_header "Phase 1: Service Health Checks"

for service in "${!SERVICE_URLS[@]}"; do
    test_service_health "$service" "${SERVICE_URLS[$service]}"
done

# Test gateway
test_service_health "gateway" "$GATEWAY_URL"

# Phase 2: GraphQL Schema Introspection
print_header "Phase 2: GraphQL Schema Introspection"

for service in "${!SERVICE_URLS[@]}"; do
    test_graphql_query "$service" "${SERVICE_URLS[$service]}" \
        "{__schema{queryType{name}}}" \
        "Schema introspection"
done

# Phase 3: Basic Queries
print_header "Phase 3: Basic Service Queries"

# User Service
test_graphql_query "user-service" "${SERVICE_URLS[user-service]}" \
    "{users{id email}}" \
    "List users"

# Shop Service
test_graphql_query "shop-service" "${SERVICE_URLS[shop-service]}" \
    "{products(take:5){id name price}}" \
    "List products"

test_graphql_query "shop-service" "${SERVICE_URLS[shop-service]}" \
    "{categories{id name}}" \
    "List categories"

# Accounting Service
test_graphql_query "accounting-service" "${SERVICE_URLS[accounting-service]}" \
    "{accounts{id name type}}" \
    "List accounts"

# Masterdata Service
test_graphql_query "masterdata-service" "${SERVICE_URLS[masterdata-service]}" \
    "{currencies{id code name}}" \
    "List currencies"

# Orders Service
test_graphql_query "orders-service" "${SERVICE_URLS[orders-service]}" \
    "{orders{id status}}" \
    "List orders"

# Phase 4: Federation Tests (via Gateway)
print_header "Phase 4: Apollo Federation Tests"

if curl -s "$GATEWAY_URL/health" &>/dev/null || curl -s "$GATEWAY_URL/graphql" &>/dev/null; then
    # Test federated queries
    test_graphql_query "gateway" "$GATEWAY_URL" \
        "{users{id email}}" \
        "Federated users query"
    
    test_graphql_query "gateway" "$GATEWAY_URL" \
        "{products(take:5){id name}}" \
        "Federated products query"
    
    test_graphql_query "gateway" "$GATEWAY_URL" \
        "{accounts{id name}}" \
        "Federated accounts query"
    
    test_graphql_query "gateway" "$GATEWAY_URL" \
        "{orders{id status}}" \
        "Federated orders query"
    
    # Test cross-service queries
    test_graphql_query "gateway" "$GATEWAY_URL" \
        "{users{id email} orders{id status}}" \
        "Cross-service query (users + orders)"
else
    print_skip "Gateway tests (gateway not available)"
fi

# Phase 5: Service Logs Check
print_header "Phase 5: Service Logs Analysis"

for service in "user-service" "shop-service" "accounting-service" "masterdata-service" "orders-service" "gateway"; do
    check_service_logs "$service"
done

# Summary
print_header "Test Summary"
log "Tests Passed:  ${GREEN}$TESTS_PASSED${NC}"
log "Tests Failed:  ${RED}$TESTS_FAILED${NC}"
log "Tests Skipped: ${YELLOW}$TESTS_SKIPPED${NC}"
log "Total Tests:   $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
log "\nDetailed log: $LOG_FILE"

# Exit code
if [[ $TESTS_FAILED -eq 0 ]]; then
    log "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    log "\n${RED}✗ Some tests failed. Check logs for details.${NC}\n"
    exit 1
fi
