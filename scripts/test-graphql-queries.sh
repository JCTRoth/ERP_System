#!/bin/bash

# Test GraphQL Queries Script
# This script tests all the queries that were failing in the frontend

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Testing GraphQL Queries..."
echo ""

# Test 1: GetOrdersForInvoice
echo -n "Testing GetOrdersForInvoice... "
RESPONSE=$(wget -qO- --post-data='{"query": "query GetOrdersForInvoice($statusFilter: [OrderStatus!]) { shopOrders(first: 50, where: {status: {in: $statusFilter}}) { nodes { id orderNumber status total subtotal taxAmount customerId } } }", "variables": {"statusFilter": ["CONFIRMED", "SHIPPED", "DELIVERED"]}}' --header='Content-Type: application/json' http://localhost:4000/graphql 2>&1)

if echo "$RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "Response: $(echo $RESPONSE | head -c 150)..."
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test 2: GetProductsForInvoice
echo -n "Testing GetProductsForInvoice... "
RESPONSE=$(wget -qO- --post-data='{"query": "query GetProductsForInvoice { products(first: 50) { nodes { id name sku price } } }"}' --header='Content-Type: application/json' http://localhost:4000/graphql 2>&1)

if echo "$RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "Response: $(echo $RESPONSE | head -c 150)..."
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test 3: GetOrderDetailsForInvoice
echo -n "Testing GetOrderDetailsForInvoice... "
RESPONSE=$(wget -qO- --post-data='{"query": "query GetOrderDetailsForInvoice($id: UUID!) { shopOrder(id: $id) { id orderNumber subtotal taxAmount total customerId items { id productId productName quantity unitPrice total } } }", "variables": {"id": "50000000-0000-0000-0000-000000000001"}}' --header='Content-Type: application/json' http://localhost:4000/graphql 2>&1)

if echo "$RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "Response: $(echo $RESPONSE | head -c 150)..."
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo -e "${GREEN}All queries passed! ✓${NC}"
echo ""
echo "If the frontend is still showing errors, you need to:"
echo "1. Open browser DevTools (F12)"
echo "2. Right-click the refresh button"
echo "3. Select 'Empty Cache and Hard Reload'"
echo "   OR"
echo "4. Go to Application tab → Storage → Clear site data"
echo ""
echo "Alternatively, try accessing the app in an incognito/private window."
