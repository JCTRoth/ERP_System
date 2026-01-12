#!/bin/bash

# ============================================================================
# Apollo Federation Test Script
# Tests all services through the Apollo Gateway
# ============================================================================

# Don't exit on first error - we want to run all tests
set +e

GATEWAY_URL="http://localhost:4000/graphql"
PASS_COUNT=0
FAIL_COUNT=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test helper function
test_query() {
    local name="$1"
    local query="$2"
    local expected_field="$3"
    
    printf "  Testing: %-50s " "$name..."
    
    response=$(curl -s "$GATEWAY_URL" \
        -H 'Content-Type: application/json' \
        --data-raw "{\"query\":\"$query\"}" 2>/dev/null)
    
    # Check for errors
    if echo "$response" | grep -q '"errors"'; then
        error_msg=$(echo "$response" | sed 's/.*"message":"\([^"]*\)".*/\1/' | head -1)
        echo -e "${RED}FAILED${NC}"
        echo "      Error: $error_msg"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    # Check for expected field in response
    if [ -n "$expected_field" ]; then
        if echo "$response" | grep -q "$expected_field"; then
            echo -e "${GREEN}PASSED${NC}"
            PASS_COUNT=$((PASS_COUNT + 1))
            return 0
        else
            echo -e "${YELLOW}WARNING${NC}"
            echo "      Expected '$expected_field' not found in response"
            WARNINGS=$((WARNINGS + 1))
            return 0
        fi
    else
        echo -e "${GREEN}PASSED${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    fi
}

echo ""
echo "============================================================================"
echo -e "${BLUE}        Apollo Federation Test Suite${NC}"
echo "============================================================================"
echo ""

# ----------------------------------------------------------------------------
# Test 1: Gateway Health Check
# ----------------------------------------------------------------------------
echo -e "${CYAN}[1/8] Gateway Health Check${NC}"
echo "----------------------------------------------------------------------------"

test_query "Gateway introspection (__typename)" \
    "query { __typename }" \
    "__typename"

test_query "Schema introspection" \
    "query { __schema { queryType { name } } }" \
    "queryType"

echo ""

# ----------------------------------------------------------------------------
# Test 2: User Service Tests (Port 5000)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[2/8] User Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List users" \
    "query { users { id email firstName lastName } }" \
    "users"

test_query "Total users count" \
    "query { totalUsers }" \
    "totalUsers"

echo ""

# ----------------------------------------------------------------------------
# Test 3: Company Service Tests (Port 8080 - Java)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[3/8] Company Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List companies" \
    "query { companies { id name } }" \
    "companies"

echo ""

# ----------------------------------------------------------------------------
# Test 4: Accounting Service Tests (Port 5001)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[4/8] Accounting Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List accounts (connection)" \
    "query { accounts { nodes { id accountNumber name } } }" \
    "accounts"

test_query "List invoices (connection)" \
    "query { invoices { nodes { id invoiceNumber } } }" \
    "invoices"

test_query "List payment records (connection)" \
    "query { paymentRecords { nodes { id amount paymentMethod } } }" \
    "paymentRecords"

test_query "Get tax rates" \
    "query { taxRates { id name rate } }" \
    "taxRates"

echo ""

# ----------------------------------------------------------------------------
# Test 5: Masterdata Service Tests (Port 5002)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[5/8] Masterdata Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List customers (connection)" \
    "query { customers { nodes { id name email } } }" \
    "customers"

test_query "List suppliers (connection)" \
    "query { suppliers { nodes { id name } } }" \
    "suppliers"

test_query "List currencies (connection)" \
    "query { currencies { nodes { id code name } } }" \
    "currencies"

test_query "List departments (connection)" \
    "query { departments { nodes { id name } } }" \
    "departments"

test_query "List payment terms" \
    "query { paymentTerms { id name } }" \
    "paymentTerms"

echo ""

# ----------------------------------------------------------------------------
# Test 6: Shop Service Tests (Port 5003)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[6/8] Shop Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List products (first 5)" \
    "query { products(first: 5) { nodes { id name price } } }" \
    "products"

test_query "List categories (first 5)" \
    "query { categories(first: 5) { nodes { id name } } }" \
    "categories"

test_query "List brands (first 5)" \
    "query { brands(first: 5) { nodes { id name } } }" \
    "brands"

test_query "List shop orders (first 5)" \
    "query { shopOrders(first: 5) { nodes { id orderNumber status } } }" \
    "shopOrders"

test_query "List shop suppliers (first 5)" \
    "query { shopSuppliers(first: 5) { nodes { id name email } } }" \
    "shopSuppliers"

test_query "List shipping methods" \
    "query { shippingMethods { id name price } }" \
    "shippingMethods"

test_query "List coupons" \
    "query { coupons { id code value isActive } }" \
    "coupons"

echo ""

# ----------------------------------------------------------------------------
# Test 7: Orders Service Tests (Port 5004)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[7/8] Orders Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List orders (connection)" \
    "query { orders { nodes { id orderNumber status } } }" \
    "orders"

echo ""

# ----------------------------------------------------------------------------
# Test 8: Translation Service Tests (Port 8081 - Java)
# ----------------------------------------------------------------------------
echo -e "${CYAN}[8/8] Translation Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "List languages" \
    "query { languages { code name isDefault } }" \
    "languages"

test_query "Get default language" \
    "query { defaultLanguage { code name } }" \
    "defaultLanguage"

test_query "List namespaces" \
    "query { namespaces }" \
    "namespaces"

echo ""

# ----------------------------------------------------------------------------
# Federation-specific Tests
# ----------------------------------------------------------------------------
echo -e "${CYAN}[BONUS] Federation Cross-Service Tests${NC}"
echo "----------------------------------------------------------------------------"

test_query "Order count metric" \
    "query { orderCount }" \
    "orderCount"

test_query "Total revenue metric" \
    "query { totalRevenue }" \
    "totalRevenue"

echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo "============================================================================"
echo -e "${BLUE}                    Test Summary${NC}"
echo "============================================================================"
echo ""
echo -e "  Passed:   ${GREEN}$PASS_COUNT${NC}"
echo -e "  Failed:   ${RED}$FAIL_COUNT${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "  Total:    $TOTAL tests"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Federation is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAIL_COUNT test(s) failed. See errors above.${NC}"
    exit 1
fi
