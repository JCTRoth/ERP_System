#!/usr/bin/env bash
# Test Federation from inside the Docker network
# This script runs tests from within a container that has access to the backend network

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_header() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

# Test function that runs curl from within a Docker container
test_from_container() {
    local service=$1
    local url=$2
    local description=$3
    local query=$4
    
    echo -n "Testing $description... "
    
    # Run curl from within the gateway container (it has access to backend network)
    result=$(docker exec erp-gateway sh -c "curl -s -X POST '$url' \
        -H 'Content-Type: application/json' \
        -d '{\"query\":\"$query\"}' 2>&1" || echo "ERROR")
    
    if [[ "$result" == "ERROR" ]] || [[ -z "$result" ]]; then
        print_error "$description - Connection failed"
        return 1
    fi
    
    if echo "$result" | grep -q '"errors"'; then
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

print_header "Testing Services from Docker Network"

# Test individual services
print_header "Testing Individual GraphQL Services"

test_from_container "user-service" "http://user-service:5000/graphql" \
    "User Service Schema" "{__schema{queryType{name}}}"

test_from_container "shop-service" "http://shop-service:5003/graphql" \
    "Shop Service Schema" "{__schema{queryType{name}}}"

test_from_container "accounting-service" "http://accounting-service:5001/graphql" \
    "Accounting Service Schema" "{__schema{queryType{name}}}"

test_from_container "masterdata-service" "http://masterdata-service:5002/graphql" \
    "Masterdata Service Schema" "{__schema{queryType{name}}}"

test_from_container "orders-service" "http://orders-service:5004/graphql" \
    "Orders Service Schema" "{__schema{queryType{name}}}"

# Test basic queries
print_header "Testing Basic Queries"

test_from_container "user-service" "http://user-service:5000/graphql" \
    "List Users" "{users{id email}}"

test_from_container "shop-service" "http://shop-service:5003/graphql" \
    "List Products" "{products(take:5){id name}}"

test_from_container "accounting-service" "http://accounting-service:5001/graphql" \
    "List Accounts" "{accounts{id name}}"

test_from_container "masterdata-service" "http://masterdata-service:5002/graphql" \
    "List Currencies" "{currencies{id code}}"

test_from_container "orders-service" "http://orders-service:5004/graphql" \
    "List Orders" "{orders{id status}}"

# Check service logs
print_header "Checking Service Logs for Errors"

check_logs() {
    local service=$1
    echo -n "Checking $service logs... "
    
    errors=$(docker compose logs "$service" --tail=50 2>&1 | \
        grep -i "error\|exception\|fatal" | \
        grep -v "0 Error" | \
        wc -l)
    
    if [ "$errors" -gt 0 ]; then
        print_error "$service has $errors error lines"
        docker compose logs "$service" --tail=20 | grep -i "error\|exception" | head -5
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
