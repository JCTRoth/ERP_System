#!/bin/bash

###############################################################################
# ERP System Production Deployment Test Script
#
# Tests all critical endpoints and functionality after deployment
###############################################################################

set -euo pipefail

DOMAIN="${1:-shopping-now.net}"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Testing Production Deployment at $DOMAIN ==="
echo ""

# Test 1: Health Check
echo -n "1. Health Check... "
HEALTH=$(curl -sk "https://$DOMAIN/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Response: $HEALTH"
    exit 1
fi

# Test 2: HTTP→HTTPS Redirect
echo -n "2. HTTP→HTTPS Redirect... "
REDIRECT=$(curl -sI "http://$DOMAIN" 2>/dev/null | grep -E "^HTTP|^Location")
if echo "$REDIRECT" | grep -q "301\|302" && echo "$REDIRECT" | grep -q "https://"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Response: $REDIRECT"
    exit 1
fi

# Test 3: GraphQL Gateway
echo -n "3. GraphQL Gateway... "
GRAPHQL=$(curl -sk -X POST "https://$DOMAIN/graphql" \
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
ORDERS=$(curl -sk -X POST "https://$DOMAIN/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ shopOrders(first: 1) { edges { node { orderNumber } } } }"}' 2>/dev/null)
if echo "$ORDERS" | grep -q "shopOrders"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Response: $ORDERS"
    exit 1
fi

# Test 5: Frontend Loads
echo -n "5. Frontend... "
FRONTEND=$(curl -sk "https://$DOMAIN" 2>/dev/null)
if echo "$FRONTEND" | grep -q "ERP System"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Could not load frontend"
    exit 1
fi

echo ""
echo -e "${GREEN}=== All Tests Passed ✓ ===${NC}"
echo "Deployment at https://$DOMAIN is working correctly!"
