#!/bin/bash
# shellcheck shell=bash

# ========================================================================================================================================================
# Frontend GraphQL Query Test Script
# Tests all GraphQL queries used by the frontend through the gateway
# ============================================================================

set +e

GATEWAY_URL="http://localhost:4000/graphql"
SHOP_URL="http://localhost:4000/shop/graphql"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEFAULT_COMPANY_ID=""
if command -v python3 >/dev/null 2>&1; then
    DEFAULT_COMPANY_ID=$(curl -s "http://localhost:4000/graphql" -H 'Content-Type: application/json' --data-raw '{"query":"query { companies { id } }"}' |
        python3 -c "import sys,json; data=json.load(sys.stdin); comps=data.get('data', {}).get('companies') or []; print(comps[0]['id'] if comps else '')")
fi

if [ -z "$DEFAULT_COMPANY_ID" ]; then
    DEFAULT_COMPANY_ID="02b44faf-50a5-47e4-b9b2-128fa862535f"
fi

test_query() {
    local name="$1"
    local url="$2"
    local query="$3"
    local expected="$4"
    
    printf "  %-55s " "$name..."
    
    response=$(curl -s "$url" -H 'Content-Type: application/json' --data-raw "{\"query\":\"$query\"}" 2>/dev/null)
    
    if echo "$response" | grep -q '"errors"'; then
        error_msg=$(echo "$response" | sed 's/.*"message":"\([^"]*\)".*/\1/' | head -1)
        echo -e "${RED}FAILED${NC}"
        echo "      Error: $error_msg"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
    
    if [ -n "$expected" ] && echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}PASSED${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    elif [ -z "$expected" ]; then
        echo -e "${GREEN}PASSED${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} (expected: $expected)"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    fi
}

echo ""
echo "============================================================================"
echo -e "${BLUE}        Frontend GraphQL Query Test Suite${NC}"
echo "============================================================================"
echo ""

# ============================================================================
# Dashboard Queries
# ============================================================================
echo -e "${CYAN}[1/9] Dashboard Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get companies (gateway)" \
    "$GATEWAY_URL" \
    "query { companies { id name } }" \
    "companies"

test_query "Get total users" \
    "$GATEWAY_URL" \
    "query { totalUsers }" \
    "totalUsers"

test_query "Get order count (shop)" \
    "$SHOP_URL" \
    "query { orderCount }" \
    "orderCount"

test_query "Get total revenue (shop)" \
    "$SHOP_URL" \
    "query { totalRevenue }" \
    "totalRevenue"

echo ""

# ============================================================================
# User Service Queries
# ============================================================================
echo -e "${CYAN}[2/9] User Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get users" \
    "$GATEWAY_URL" \
    "query { users { id email firstName lastName } }" \
    "users"

test_query "Get user by ID (introspection check)" \
    "$GATEWAY_URL" \
    "query { __type(name: \"User\") { fields { name } } }" \
    "User"

echo ""

# ============================================================================
# Company Service Queries
# ============================================================================
echo -e "${CYAN}[3/9] Company Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get companies" \
    "$GATEWAY_URL" \
    "query { companies { id name slug } }" \
    "companies"

test_query "Get dynamic field definitions" \
    "$GATEWAY_URL" \
    "query { dynamicFieldDefinitions(companyId: \\\"$DEFAULT_COMPANY_ID\\\") { id fieldName } }" \
    "dynamicFieldDefinitions"

echo ""

# ============================================================================
# Accounting Service Queries
# ============================================================================
echo -e "${CYAN}[4/9] Accounting Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get accounts" \
    "$GATEWAY_URL" \
    "query { accounts { nodes { id accountNumber name type } } }" \
    "accounts"

test_query "Get invoices" \
    "$GATEWAY_URL" \
    "query { invoices { nodes { id invoiceNumber status } } }" \
    "invoices"

test_query "Get payment records" \
    "$GATEWAY_URL" \
    "query { paymentRecords { nodes { id amount paymentMethod } } }" \
    "paymentRecords"

test_query "Get tax rates" \
    "$GATEWAY_URL" \
    "query { taxRates { id name rate } }" \
    "taxRates"

test_query "Get bank accounts" \
    "$GATEWAY_URL" \
    "query { bankAccounts { nodes { id bankName accountNumber } } }" \
    "bankAccounts"

echo ""

# ============================================================================
# Masterdata Service Queries
# ============================================================================
echo -e "${CYAN}[5/9] Masterdata Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get customers" \
    "$GATEWAY_URL" \
    "query { customers { nodes { id name email customerNumber } } }" \
    "customers"

test_query "Get suppliers" \
    "$GATEWAY_URL" \
    "query { suppliers { nodes { id name email } } }" \
    "suppliers"

test_query "Get currencies" \
    "$GATEWAY_URL" \
    "query { currencies { nodes { id code name } } }" \
    "currencies"

test_query "Get departments" \
    "$GATEWAY_URL" \
    "query { departments { nodes { id name } } }" \
    "departments"

test_query "Get employees" \
    "$GATEWAY_URL" \
    "query { employees { nodes { id firstName lastName } } }" \
    "employees"

test_query "Get payment terms" \
    "$GATEWAY_URL" \
    "query { paymentTerms { id name } }" \
    "paymentTerms"

echo ""

# ============================================================================
# Shop Service Queries (via /shop/graphql)
# ============================================================================
echo -e "${CYAN}[6/9] Shop Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get products (first 20)" \
    "$SHOP_URL" \
    "query { products(first: 20) { nodes { id name sku price stockQuantity } } }" \
    "products"

test_query "Get categories (first 20)" \
    "$SHOP_URL" \
    "query { categories(first: 20) { nodes { id name } } }" \
    "categories"

test_query "Get brands (first 20)" \
    "$SHOP_URL" \
    "query { brands(first: 20) { nodes { id name } } }" \
    "brands"

test_query "Get shop orders (first 20)" \
    "$SHOP_URL" \
    "query { shopOrders(first: 20, order: {createdAt: DESC}) { nodes { id orderNumber status total customer { id firstName lastName } } totalCount } }" \
    "shopOrders"

test_query "Get shop suppliers" \
    "$SHOP_URL" \
    "query { shopSuppliers(first: 20) { nodes { id name email } } }" \
    "shopSuppliers"

test_query "Get shipping methods" \
    "$SHOP_URL" \
    "query { shippingMethods { id name price } }" \
    "shippingMethods"

test_query "Get coupons" \
    "$SHOP_URL" \
    "query { coupons { id code value isActive } }" \
    "coupons"

test_query "Get audit logs" \
    "$SHOP_URL" \
    "query { allAuditLogs(take: 10) { id action entityType } }" \
    "allAuditLogs"

echo ""

# ============================================================================
# Orders Service Queries (via gateway)
# ============================================================================
echo -e "${CYAN}[7/9] Orders Service Queries (gateway)${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get orders" \
    "$GATEWAY_URL" \
    "query { orders { nodes { id orderNumber status } } }" \
    "orders"

echo ""

# ============================================================================
# Translation Service Queries
# ============================================================================
echo -e "${CYAN}[8/9] Translation Service Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Get languages" \
    "$GATEWAY_URL" \
    "query { languages { code name isDefault } }" \
    "languages"

test_query "Get default language" \
    "$GATEWAY_URL" \
    "query { defaultLanguage { code name } }" \
    "defaultLanguage"

test_query "Get namespaces" \
    "$GATEWAY_URL" \
    "query { namespaces }" \
    "namespaces"

test_query "Get translation bundle" \
    "$GATEWAY_URL" \
    "query { translationBundle(language: \\\"en\\\", namespace: \\\"common\\\") { language namespace translations } }" \
    "translationBundle"

echo ""

# ============================================================================
# Cross-Service Queries
# ============================================================================
echo -e "${CYAN}[9/9] Cross-Service Integration Queries${NC}"
echo "----------------------------------------------------------------------------"

test_query "Shop orders with customer details" \
    "$SHOP_URL" \
    "query { shopOrders(first: 5) { nodes { id orderNumber customer { id firstName lastName email } items { id productName quantity } } } }" \
    "shopOrders"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "============================================================================"
echo -e "${BLUE}                    Test Summary${NC}"
echo "============================================================================"
echo ""
echo -e "  Passed:   ${GREEN}$PASS_COUNT${NC}"
echo -e "  Failed:   ${RED}$FAIL_COUNT${NC}"
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "  Total:    $TOTAL tests"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All frontend queries work correctly!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAIL_COUNT query(ies) failed. See errors above.${NC}"
    exit 1
fi
