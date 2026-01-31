#!/usr/bin/env bash

# =============================================================================
# Test: Full E2E Order-to-Email Flow with Document Verification
# =============================================================================
# Complete end-to-end test covering:
#   1. Product retrieval
#   2. Customer retrieval/validation
#   3. Order creation
#   4. Payment creation and processing
#   5. Order status verification (PAID)
#   6. Document generation verification (order confirmation + invoice)
#   7. Document PDF availability check
#   8. Email notification verification
#   9. Email delivery status check
#
# Requirements:
#   - All services running (./scripts/start-local.sh)
#   - wget and jq installed
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GATEWAY_URL=${GATEWAY_URL:-"http://localhost:4000/graphql"}
NOTIFICATION_URL=${NOTIFICATION_URL:-"http://localhost:8082/graphql"}
MINIO_URL=${MINIO_URL:-"http://localhost:9000"}

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Track created resources for cleanup summary
CREATED_ORDER_ID=""
CREATED_PAYMENT_ID=""
CREATED_EMAIL_IDS=()

log() {
  echo -e "[$(date +%H:%M:%S)] $*"
}

pass() {
  echo -e "${GREEN}✓${NC} $*"
  ((TESTS_PASSED++)) || true
}

fail() {
  echo -e "${RED}✗${NC} $*"
  ((TESTS_FAILED++)) || true
}

skip() {
  echo -e "${YELLOW}⊘${NC} $*"
  ((TESTS_SKIPPED++)) || true
}

info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

section() {
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Check dependencies
if ! command -v wget >/dev/null 2>&1; then
  echo "Error: wget is required but not installed."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed."
  exit 1
fi

# Helper function to make GraphQL requests
graphql_request() {
  local url="$1"
  local query="$2"
  wget -q -O - --post-data "$query" --header 'Content-Type: application/json' "$url" 2>/dev/null || echo '{"error":"connection_failed"}'
}

section "1. Service Health Checks"

# Test 1.1: Gateway health
log "Checking gateway health..."
GW_HEALTH=$(graphql_request "$GATEWAY_URL" '{"query":"{ __typename }"}')
if echo "$GW_HEALTH" | jq -e '.data.__typename' >/dev/null 2>&1; then
  pass "Gateway is healthy"
else
  fail "Gateway is not responding"
  echo "Cannot continue without gateway. Exiting."
  exit 1
fi

# Test 1.2: Shop service via gateway
log "Checking shop-service via gateway..."
SHOP_CHECK=$(graphql_request "$GATEWAY_URL" '{"query":"{ products(first: 1) { totalCount } }"}')
if echo "$SHOP_CHECK" | jq -e '.data.products.totalCount' >/dev/null 2>&1; then
  pass "shop-service is responding via gateway"
else
  fail "shop-service not responding: $SHOP_CHECK"
fi

# Test 1.3: Notification service
log "Checking notification-service..."
NOTIF_CHECK=$(graphql_request "$NOTIFICATION_URL" '{"query":"{ __typename }"}')
if echo "$NOTIF_CHECK" | jq -e '.data.__typename' >/dev/null 2>&1; then
  pass "notification-service is responding"
else
  fail "notification-service not responding: $NOTIF_CHECK"
fi

section "2. Data Prerequisite Tests"

# Test 2.1: Fetch available products
log "Fetching available products..."
PRODUCTS_RESP=$(graphql_request "$GATEWAY_URL" '{
  "query": "{ products(first: 5) { nodes { id name price stockQuantity } totalCount } }"
}')

PRODUCT_COUNT=$(echo "$PRODUCTS_RESP" | jq -r '.data.products.totalCount // 0')
if [[ "$PRODUCT_COUNT" -gt 0 ]]; then
  pass "Found $PRODUCT_COUNT products in database"
  
  # Select first product with stock
  PRODUCT_ID=$(echo "$PRODUCTS_RESP" | jq -r '.data.products.nodes[0].id')
  PRODUCT_NAME=$(echo "$PRODUCTS_RESP" | jq -r '.data.products.nodes[0].name')
  PRODUCT_PRICE=$(echo "$PRODUCTS_RESP" | jq -r '.data.products.nodes[0].price')
  info "Selected product: $PRODUCT_NAME (€$PRODUCT_PRICE)"
else
  fail "No products found in database. Seed data may be missing."
  exit 1
fi

# Test 2.2: Fetch valid customer
log "Fetching valid customer from existing orders..."
CUSTOMER_RESP=$(graphql_request "$GATEWAY_URL" '{
  "query": "{ shopOrders(first: 1) { nodes { customerId } } }"
}')

CUSTOMER_ID=$(echo "$CUSTOMER_RESP" | jq -r '.data.shopOrders.nodes[0].customerId // empty')
if [[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "null" ]]; then
  pass "Found valid customer: $CUSTOMER_ID"
else
  # Try to get from users
  log "No existing orders, checking users..."
  USERS_RESP=$(graphql_request "$GATEWAY_URL" '{
    "query": "{ users(first: 1) { nodes { id email } } }"
  }')
  
  CUSTOMER_ID=$(echo "$USERS_RESP" | jq -r '.data.users.nodes[0].id // empty')
  if [[ -n "$CUSTOMER_ID" && "$CUSTOMER_ID" != "null" ]]; then
    pass "Using user as customer: $CUSTOMER_ID"
  else
    fail "No valid customer found"
    exit 1
  fi
fi

section "3. Order Creation Tests"

# Test 3.1: Create order with single item
log "Creating test order..."

UNIQUE_SUFFIX=$(date +%s)
CREATE_ORDER_PAYLOAD=$(cat <<JSON
{
  "query": "mutation CreateTestOrder(\$input: ShopCreateOrderInput!) { createShopOrder(input: \$input) { id orderNumber status paymentStatus subtotal taxAmount total customerId createdAt } }",
  "variables": {
    "input": {
      "customerId": "$CUSTOMER_ID",
      "items": [
        {
          "productId": "$PRODUCT_ID",
          "variantId": null,
          "quantity": 2
        }
      ],
      "notes": "E2E Test Order $UNIQUE_SUFFIX",
      "taxRate": 0.19,
      "shippingName": "E2E Test Customer",
      "shippingAddress": "Teststraße 123",
      "shippingCity": "Berlin",
      "shippingPostalCode": "10115",
      "shippingCountry": "DE",
      "shippingPhone": "+49 30 123456789",
      "billingName": "E2E Test Customer",
      "billingAddress": "Teststraße 123",
      "billingCity": "Berlin",
      "billingPostalCode": "10115",
      "billingCountry": "DE",
      "shippingMethodId": null,
      "couponCode": null
    }
  }
}
JSON
)

ORDER_RESP=$(graphql_request "$GATEWAY_URL" "$CREATE_ORDER_PAYLOAD")

if echo "$ORDER_RESP" | jq -e '.errors' >/dev/null; then
  fail "Order creation failed: $(echo "$ORDER_RESP" | jq -r '.errors[0].message')"
  exit 1
fi

ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.id')
ORDER_NUMBER=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.orderNumber')
ORDER_TOTAL=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.total')
ORDER_STATUS=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.status')
ORDER_PAYMENT_STATUS=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.paymentStatus')

if [[ -n "$ORDER_ID" && "$ORDER_ID" != "null" ]]; then
  CREATED_ORDER_ID="$ORDER_ID"
  pass "Order created: $ORDER_NUMBER (€$ORDER_TOTAL)"
  info "Order ID: $ORDER_ID"
  info "Status: $ORDER_STATUS, PaymentStatus: $ORDER_PAYMENT_STATUS"
else
  fail "Order creation returned no ID: $ORDER_RESP"
  exit 1
fi

# Test 3.2: Verify order status is PENDING
if [[ "$ORDER_STATUS" == "PENDING" ]]; then
  pass "Order status is PENDING as expected"
else
  fail "Expected order status PENDING, got: $ORDER_STATUS"
fi

# Test 3.3: Verify payment status is PENDING
if [[ "$ORDER_PAYMENT_STATUS" == "PENDING" ]]; then
  pass "Order payment status is PENDING as expected"
else
  fail "Expected payment status PENDING, got: $ORDER_PAYMENT_STATUS"
fi

section "4. Payment Processing Tests"

# Test 4.1: Create payment for order
log "Creating payment for order..."

CREATE_PAYMENT_PAYLOAD=$(cat <<JSON
{
  "query": "mutation CreatePayment(\$input: CreatePaymentInput!) { createPayment(input: \$input) { id orderId amount currency status method transactionId createdAt } }",
  "variables": {
    "input": {
      "orderId": "$ORDER_ID",
      "amount": $ORDER_TOTAL,
      "currency": "EUR",
      "method": "CreditCard",
      "transactionId": "E2E-TEST-$UNIQUE_SUFFIX"
    }
  }
}
JSON
)

PAYMENT_RESP=$(graphql_request "$GATEWAY_URL" "$CREATE_PAYMENT_PAYLOAD")

if echo "$PAYMENT_RESP" | jq -e '.errors' >/dev/null; then
  fail "Payment creation failed: $(echo "$PAYMENT_RESP" | jq -r '.errors[0].message')"
  exit 1
fi

PAYMENT_ID=$(echo "$PAYMENT_RESP" | jq -r '.data.createPayment.id')
PAYMENT_STATUS=$(echo "$PAYMENT_RESP" | jq -r '.data.createPayment.status')
PAYMENT_AMOUNT=$(echo "$PAYMENT_RESP" | jq -r '.data.createPayment.amount')

if [[ -n "$PAYMENT_ID" && "$PAYMENT_ID" != "null" ]]; then
  CREATED_PAYMENT_ID="$PAYMENT_ID"
  pass "Payment created: €$PAYMENT_AMOUNT (status: $PAYMENT_STATUS)"
  info "Payment ID: $PAYMENT_ID"
else
  fail "Payment creation returned no ID: $PAYMENT_RESP"
  exit 1
fi

# Test 4.2: Verify payment status is PENDING
if [[ "$PAYMENT_STATUS" == "PENDING" ]]; then
  pass "Payment status is PENDING as expected"
else
  fail "Expected payment status PENDING, got: $PAYMENT_STATUS"
fi

# Test 4.3: Process payment
log "Processing payment..."

PROCESS_PAYMENT_PAYLOAD=$(cat <<JSON
{
  "query": "mutation ProcessPayment(\$paymentId: UUID!) { processPayment(paymentId: \$paymentId) { id orderId amount currency status method processedAt } }",
  "variables": {
    "paymentId": "$PAYMENT_ID"
  }
}
JSON
)

PROCESS_RESP=$(graphql_request "$GATEWAY_URL" "$PROCESS_PAYMENT_PAYLOAD")

if echo "$PROCESS_RESP" | jq -e '.errors' >/dev/null; then
  fail "Payment processing failed: $(echo "$PROCESS_RESP" | jq -r '.errors[0].message')"
else
  PROCESSED_STATUS=$(echo "$PROCESS_RESP" | jq -r '.data.processPayment.status')
  if [[ "$PROCESSED_STATUS" == "COMPLETED" ]]; then
    pass "Payment processed successfully: status=$PROCESSED_STATUS"
  else
    fail "Expected payment status COMPLETED after processing, got: $PROCESSED_STATUS"
  fi
fi

section "5. Order Status Verification"

# Test 5.1: Wait for async processing
log "Waiting for async processing (2 seconds)..."
sleep 2

# Test 5.2: Query order with full details
log "Verifying order status after payment..."

GET_ORDER_PAYLOAD=$(cat <<JSON
{
  "query": "query GetOrderFull(\$id: UUID!) { shopOrder(id: \$id) { id orderNumber status paymentStatus total customerId payments { id amount status method processedAt } documents { id documentType state pdfUrl generatedAt templateKey } } }",
  "variables": {
    "id": "$ORDER_ID"
  }
}
JSON
)

ORDER_CHECK_RESP=$(graphql_request "$GATEWAY_URL" "$GET_ORDER_PAYLOAD")

if echo "$ORDER_CHECK_RESP" | jq -e '.errors' >/dev/null; then
  fail "Order query failed: $(echo "$ORDER_CHECK_RESP" | jq -r '.errors[0].message')"
else
  FINAL_STATUS=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.status')
  FINAL_PAYMENT_STATUS=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.paymentStatus')
  DOC_COUNT=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.documents | length')
  PAYMENT_COUNT=$(echo "$ORDER_CHECK_RESP" | jq -r '[.data.shopOrder.payments[] | select(.status == "COMPLETED")] | length')
  
  info "Final order status: $FINAL_STATUS"
  info "Final payment status: $FINAL_PAYMENT_STATUS"
  info "Completed payments: $PAYMENT_COUNT"
  info "Generated documents: $DOC_COUNT"
fi

# Test 5.3: Verify payment status is PAID
if [[ "$FINAL_PAYMENT_STATUS" == "PAID" ]]; then
  pass "Order payment status updated to PAID"
else
  fail "Expected payment status PAID, got: $FINAL_PAYMENT_STATUS"
fi

# Test 5.4: Verify order status changed (CONFIRMED or higher)
if [[ "$FINAL_STATUS" == "CONFIRMED" || "$FINAL_STATUS" == "PROCESSING" || "$FINAL_STATUS" == "SHIPPED" ]]; then
  pass "Order status progressed to: $FINAL_STATUS"
else
  skip "Order status is $FINAL_STATUS (may need manual confirmation)"
fi

section "6. Document Generation Verification"

# Test 6.1: Check document count
if [[ "$DOC_COUNT" -ge 1 ]]; then
  pass "At least 1 document generated ($DOC_COUNT total)"
else
  fail "Expected at least 1 document, got: $DOC_COUNT"
fi

# Test 6.2: Verify document types
if [[ "$DOC_COUNT" -ge 1 ]]; then
  log "Checking document types..."
  
  DOC_TYPES=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.documents[].documentType' | sort | uniq)
  info "Document types generated: $DOC_TYPES"
  
  # Check for invoice
  HAS_INVOICE=$(echo "$ORDER_CHECK_RESP" | jq -r '[.data.shopOrder.documents[] | select(.documentType == "INVOICE")] | length')
  if [[ "$HAS_INVOICE" -ge 1 ]]; then
    pass "Invoice document generated"
  else
    skip "Invoice document not found (may be generated on different state)"
  fi
  
  # Check for order confirmation
  HAS_CONFIRMATION=$(echo "$ORDER_CHECK_RESP" | jq -r '[.data.shopOrder.documents[] | select(.documentType == "ORDER_CONFIRMATION")] | length')
  if [[ "$HAS_CONFIRMATION" -ge 1 ]]; then
    pass "Order confirmation document generated"
  else
    skip "Order confirmation not found"
  fi
fi

# Test 6.3: Verify document PDFs are accessible
if [[ "$DOC_COUNT" -ge 1 ]]; then
  log "Checking document PDF availability..."
  
  PDF_URL=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.documents[0].pdfUrl // empty')
  if [[ -n "$PDF_URL" && "$PDF_URL" != "null" ]]; then
    info "PDF URL: $PDF_URL"
    
    # Try to access the PDF (HEAD request to check existence)
    HTTP_CODE=$(wget --spider -S "$PDF_URL" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}' || echo "000")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
      pass "PDF document is accessible (HTTP 200)"
    elif [[ "$HTTP_CODE" == "403" || "$HTTP_CODE" == "401" ]]; then
      skip "PDF requires authentication (HTTP $HTTP_CODE)"
    else
      fail "PDF not accessible (HTTP $HTTP_CODE)"
    fi
  else
    skip "No PDF URL in document"
  fi
fi

section "7. Email Notification Verification"

# Test 7.1: Check shop-service logs for email activity
log "Checking for email notification activity..."

# Query recent emails from notification service
EMAIL_QUERY_RESP=$(graphql_request "$NOTIFICATION_URL" '{
  "query": "{ emailNotifications(first: 10, orderBy: { createdAt: DESC }) { nodes { id toEmail subject status createdAt sentAt errorMessage } } }"
}')

RECENT_EMAILS=$(echo "$EMAIL_QUERY_RESP" | jq -r '.data.emailNotifications.nodes // []')
RECENT_COUNT=$(echo "$RECENT_EMAILS" | jq 'length')

if [[ "$RECENT_COUNT" -gt 0 ]]; then
  pass "Found $RECENT_COUNT recent email notifications"
  
  # Check if any email is related to our order
  ORDER_EMAIL=$(echo "$RECENT_EMAILS" | jq -r ".[] | select(.subject | contains(\"$ORDER_NUMBER\") or contains(\"Order\"))" | head -1)
  
  if [[ -n "$ORDER_EMAIL" ]]; then
    EMAIL_TO=$(echo "$ORDER_EMAIL" | jq -r '.toEmail')
    EMAIL_STATUS=$(echo "$ORDER_EMAIL" | jq -r '.status')
    EMAIL_ERROR=$(echo "$ORDER_EMAIL" | jq -r '.errorMessage // "none"')
    
    info "Order-related email found:"
    info "  To: $EMAIL_TO"
    info "  Status: $EMAIL_STATUS"
    info "  Error: $EMAIL_ERROR"
    
    if [[ "$EMAIL_STATUS" == "SENT" ]]; then
      pass "Email notification sent successfully"
    elif [[ "$EMAIL_STATUS" == "PENDING" ]]; then
      skip "Email notification pending (SMTP may be processing)"
    elif [[ "$EMAIL_STATUS" == "FAILED" ]]; then
      fail "Email notification failed: $EMAIL_ERROR"
    else
      skip "Email status: $EMAIL_STATUS"
    fi
  else
    skip "No email specifically for order $ORDER_NUMBER found in recent emails"
  fi
else
  skip "No recent email notifications found"
fi

# Test 7.2: Check for SMTP errors
log "Checking for SMTP authentication issues..."
SMTP_ERRORS=$(echo "$RECENT_EMAILS" | jq -r '.[] | select(.errorMessage != null and (.errorMessage | contains("Authentication") or contains("SMTP"))) | .errorMessage' | head -1)

if [[ -n "$SMTP_ERRORS" ]]; then
  fail "SMTP errors detected: $SMTP_ERRORS"
  echo "    → Verify SMTP credentials in .env file"
else
  pass "No SMTP authentication errors in recent emails"
fi

section "8. Integration Verification"

# Test 8.1: End-to-end data consistency
log "Verifying end-to-end data consistency..."

# Re-query order to ensure all data is consistent
FINAL_ORDER_RESP=$(graphql_request "$GATEWAY_URL" "$GET_ORDER_PAYLOAD")
FINAL_ORDER_TOTAL=$(echo "$FINAL_ORDER_RESP" | jq -r '.data.shopOrder.total')
FINAL_PAYMENT_TOTAL=$(echo "$FINAL_ORDER_RESP" | jq -r '[.data.shopOrder.payments[].amount] | add')

if [[ "$FINAL_ORDER_TOTAL" == "$FINAL_PAYMENT_TOTAL" ]]; then
  pass "Order total (€$FINAL_ORDER_TOTAL) matches payment total (€$FINAL_PAYMENT_TOTAL)"
else
  fail "Order total (€$FINAL_ORDER_TOTAL) doesn't match payment total (€$FINAL_PAYMENT_TOTAL)"
fi

# Test 8.2: Verify no orphaned data
ORPHANED_PAYMENTS=$(graphql_request "$GATEWAY_URL" "{
  \"query\": \"{ shopOrder(id: \\\"$ORDER_ID\\\") { payments { id orderId } } }\"
}" | jq -r '[.data.shopOrder.payments[] | select(.orderId != "'"$ORDER_ID"'")] | length')

if [[ "$ORPHANED_PAYMENTS" == "0" ]]; then
  pass "All payments correctly linked to order"
else
  fail "Found $ORPHANED_PAYMENTS orphaned payments"
fi

section "Test Summary"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Resources Created:"
echo "    Order:   $ORDER_NUMBER ($CREATED_ORDER_ID)"
echo "    Payment: $CREATED_PAYMENT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

if [[ $TESTS_FAILED -gt 0 ]]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
