#!/usr/bin/env bash
# Test service connectivity from the integration environment.
# Supports Docker Compose and Kubernetes/port-forwarded local services.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
TEST_MODE="${TEST_MODE:-auto}"
K8S_NAMESPACE="${K8S_NAMESPACE:-erp-test}"
K8S_RELEASE="${K8S_RELEASE:-erp}"
K8S_NAME_PREFIX="${K8S_NAME_PREFIX:-${K8S_RELEASE}-erp-system}"

declare -A SERVICE_URLS=(
    ["user-service"]="${USER_SERVICE_URL:-http://localhost:5000/graphql}"
    ["shop-service"]="${SHOP_SERVICE_URL:-http://localhost:5003/graphql}"
    ["accounting-service"]="${ACCOUNTING_SERVICE_URL:-http://localhost:5001/graphql}"
    ["masterdata-service"]="${MASTERDATA_SERVICE_URL:-http://localhost:5002/graphql}"
    ["orders-service"]="${ORDERS_SERVICE_URL:-http://localhost:5004/graphql}"
)

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++)) || true
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++)) || true
}

print_header() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

detect_mode() {
    if [[ "$TEST_MODE" != "auto" ]]; then
        echo "$TEST_MODE"
        return
    fi

    if docker exec erp-gateway true >/dev/null 2>&1; then
        echo "docker"
        return
    fi

    if kubectl get namespace "$K8S_NAMESPACE" >/dev/null 2>&1; then
        echo "k8s"
        return
    fi

    echo "local"
}

MODE="$(detect_mode)"

graphql_request() {
    local service=$1
    local url=$2
    local query=$3

    if [[ "$MODE" == "docker" ]]; then
        docker exec erp-gateway sh -c "curl -s -X POST '$url' -H 'Content-Type: application/json' -d '{\"query\":\"$query\"}'" 2>&1 || true
        return
    fi

    curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}" 2>&1 || true
}

test_graphql() {
    local service=$1
    local url=$2
    local description=$3
    local query=$4

    echo -n "Testing $description... "

    result=$(graphql_request "$service" "$url" "$query")

    if [[ -z "$result" ]]; then
        print_error "$description - Connection failed"
        return 1
    fi

    if echo "$result" | jq -e '.errors != null' >/dev/null 2>&1; then
        print_error "$description - Has errors"
        echo "  Response: $result" | head -c 200
        return 1
    fi

    if echo "$result" | grep -q '"data"'; then
        print_success "$description"
        return 0
    fi
    
    print_error "$description - No data in response"
    return 1
}

print_header "Testing Services from $MODE"

# Test individual services
print_header "Testing Individual GraphQL Services"

test_graphql "user-service" "${SERVICE_URLS[user-service]}" \
    "User Service Root Query" "{__typename}"

test_graphql "shop-service" "${SERVICE_URLS[shop-service]}" \
    "Shop Service Root Query" "{__typename}"

test_graphql "accounting-service" "${SERVICE_URLS[accounting-service]}" \
    "Accounting Service Root Query" "{__typename}"

test_graphql "masterdata-service" "${SERVICE_URLS[masterdata-service]}" \
    "Masterdata Service Root Query" "{__typename}"

test_graphql "orders-service" "${SERVICE_URLS[orders-service]}" \
    "Orders Service Root Query" "{__typename}"

# Test basic queries
print_header "Testing Basic Queries"

test_graphql "user-service" "${SERVICE_URLS[user-service]}" \
    "List Users" "{users{id email}}"

test_graphql "shop-service" "${SERVICE_URLS[shop-service]}" \
    "List Products" "{products(first:5){nodes{id name}}}"

test_graphql "accounting-service" "${SERVICE_URLS[accounting-service]}" \
    "List Accounts" "{accounts{nodes{id name}}}"

test_graphql "masterdata-service" "${SERVICE_URLS[masterdata-service]}" \
    "List Currencies" "{currencies{nodes{id code}}}"

test_graphql "orders-service" "${SERVICE_URLS[orders-service]}" \
    "List Orders" "{orders{nodes{id status}}}"

# Check service logs
print_header "Checking Service Logs for Errors"

check_logs() {
    local service=$1
    echo -n "Checking $service logs... "

    if [[ "$MODE" == "docker" ]]; then
        logs=$(docker compose logs "$service" --tail=50 2>&1 || true)
    elif [[ "$MODE" == "k8s" ]]; then
        logs=$(kubectl logs -n "$K8S_NAMESPACE" deployment/"$K8S_NAME_PREFIX-$service" --tail=50 2>&1 || true)
    else
        print_success "$service logs check skipped in local mode"
        return 0
    fi

    errors=$(echo "$logs" | grep -i "error\|exception\|fatal" | grep -v "0 Error" | wc -l)
    
    if [ "$errors" -gt 0 ]; then
        print_error "$service has $errors error lines"
        echo "$logs" | grep -i "error\|exception" | head -5
    else
        print_success "$service logs clean"
    fi
}

check_logs "user-service"
check_logs "shop-service"
check_logs "accounting-service"
check_logs "masterdata-service"
check_logs "orders-service"

# Summary
print_header "Test Summary"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}Some tests failed.${NC}\n"
    exit 1
fi
