#!/bin/bash

###############################################################################
# ERP System Production Deployment Test Script
#
# Tests all critical endpoints and functionality after deployment
###############################################################################

set -euo pipefail

TARGET="${1:-${BASE_URL:-https://shopping-now.net}}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [[ "$TARGET" == *"://"* ]]; then
    BASE_URL="$TARGET"
else
    BASE_URL="https://$TARGET"
fi

GATEWAY_URL="${GATEWAY_URL:-$BASE_URL}"
FRONTEND_URL="${FRONTEND_URL:-$BASE_URL}"
HTTP_BASE_URL="${HTTP_BASE_URL:-}"

echo "=== Testing Deployment ==="
echo "Gateway:  $GATEWAY_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Test 1: Health Check
echo -n "1. Health Check... "
HEALTH_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>/dev/null || true)
READY_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "$GATEWAY_URL/ready" 2>/dev/null || true)
if [[ "$HEALTH_STATUS" == "200" || "$READY_STATUS" == "200" ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   /health HTTP status: ${HEALTH_STATUS:-n/a}"
    echo "   /ready HTTP status: ${READY_STATUS:-n/a}"
    exit 1
fi

# Test 2: HTTP→HTTPS Redirect
echo -n "2. HTTP→HTTPS Redirect... "
if [[ -z "$HTTP_BASE_URL" && "$BASE_URL" == https://localhost* ]]; then
    echo -e "${YELLOW}SKIP${NC}"
elif [[ -z "$HTTP_BASE_URL" && "$BASE_URL" != https://* ]]; then
    echo -e "${YELLOW}SKIP${NC}"
else
    if [[ -z "$HTTP_BASE_URL" ]]; then
        HTTP_BASE_URL="http://${BASE_URL#https://}"
    fi

    REDIRECT=$(curl -sI "$HTTP_BASE_URL" 2>/dev/null | grep -E "^HTTP|^Location")
    if echo "$REDIRECT" | grep -q "301\|302" && echo "$REDIRECT" | grep -q "https://"; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "   Response: $REDIRECT"
        exit 1
    fi
fi

# Test 3: GraphQL Gateway
echo -n "3. GraphQL Gateway... "
GRAPHQL=$(curl -sk -X POST "$GATEWAY_URL/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}' 2>/dev/null)
if echo "$GRAPHQL" | grep -q '"__typename":"Query"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Response: $GRAPHQL"
    exit 1
fi

# Test 4: Shop Orders Query
echo -n "4. Shop Orders... "
ORDERS=$(curl -sk -X POST "$GATEWAY_URL/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ shopOrders(first: 1) { nodes { orderNumber } } }"}' 2>/dev/null)
if echo "$ORDERS" | grep -q "shopOrders"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Response: $ORDERS"
    exit 1
fi

# Test 5: Frontend Loads
echo -n "5. Frontend... "
FRONTEND=$(curl -sk "$FRONTEND_URL" 2>/dev/null)
if echo "$FRONTEND" | grep -q "ERP System"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Could not load frontend"
    exit 1
fi

echo ""
echo -e "${GREEN}=== All Tests Passed ✓ ===${NC}"
echo "Deployment is working correctly!"
