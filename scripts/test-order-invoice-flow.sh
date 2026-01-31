#!/usr/bin/env bash

# End-to-end test: Order -> Payment -> Invoice + Documents
# Uses the GraphQL gateway to:
#  1. Create a test order
#  2. Create a payment for that order
#  3. Process the payment
#  4. Verify order payment status and documents
#
# Requirements:
#  - Gateway running locally (./scripts/start-local.sh)
#  - curl and jq installed
#  - CUSTOMER_ID environment variable set to a valid customer UUID
#    (falls back to admin user ID as a best-effort default)

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL=${BASE_URL:-"http://localhost:4000/graphql"}

# Best-effort default customer (super admin user); override with CUSTOMER_ID
DEFAULT_CUSTOMER_ID="00000000000000000000000000000001"
CUSTOMER_ID=${CUSTOMER_ID:-$DEFAULT_CUSTOMER_ID}

log() {
  echo -e "[$(date +%H:%M:%S)] $*"
}

pass() {
  echo -e "${GREEN}✓$NC $*"
}

fail() {
  echo -e "${RED}✗$NC $*"
  exit 1
}

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required but not installed."
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "jq is required but not installed. Please install jq and retry."
fi

log "Using GraphQL endpoint: $BASE_URL"

# -1) Get a valid customer ID from an existing order (if CUSTOMER_ID not set)
if [[ "$CUSTOMER_ID" == "$DEFAULT_CUSTOMER_ID" ]]; then
  log "Fetching a valid customer ID from existing orders..."
  CUSTOMER_RESP=$(curl -sS "$BASE_URL" \
    -H 'Content-Type: application/json' \
    -d '{"query":"{ shopOrders(first:1) { nodes { customerId } } }"}') || fail "shopOrders query failed."

  FETCHED_CUSTOMER_ID=$(echo "$CUSTOMER_RESP" | jq -r '.data.shopOrders.nodes[0].customerId // empty')
  if [[ -n "$FETCHED_CUSTOMER_ID" ]]; then
    CUSTOMER_ID="$FETCHED_CUSTOMER_ID"
    pass "Using customer ID from existing order: $CUSTOMER_ID"
  else
    log "No existing orders found; will use default customer ID (may fail if customer not seeded)"
  fi
fi

log "Using CUSTOMER_ID: $CUSTOMER_ID"

# 0) Get a valid product ID
log "Fetching a valid product ID..."

PRODUCT_RESP=$(curl -sS "$BASE_URL" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products(first:1) { nodes { id name price } } }"}') || fail "products query failed."

PRODUCT_ID=$(echo "$PRODUCT_RESP" | jq -r '.data.products.nodes[0].id // empty')

if [[ -z "$PRODUCT_ID" ]]; then
  echo "$PRODUCT_RESP" | jq -r '.'
  fail "No products found in the shop database. Seed data might be missing."
fi

PRODUCT_NAME=$(echo "$PRODUCT_RESP" | jq -r '.data.products.nodes[0].name')
pass "Using product: $PRODUCT_NAME (id=$PRODUCT_ID)"

# 1) Create test order
log "Creating test order..."

CREATE_ORDER_PAYLOAD=$(cat <<JSON
{
  "query": "mutation CreateTestOrder(\$input: ShopCreateOrderInput!) { createShopOrder(input: \$input) { id orderNumber status paymentStatus subtotal taxAmount total customerId } }",
  "variables": {
    "input": {
      "customerId": "$CUSTOMER_ID",
      "items": [
        {
          "productId": "$PRODUCT_ID",
          "variantId": null,
          "quantity": 1
        }
      ],
      "notes": "Test order for invoice automation (script)",
      "taxRate": 0.19,
      "shippingName": "Test Customer",
      "shippingAddress": "Teststr. 1",
      "shippingCity": "Teststadt",
      "shippingPostalCode": "12345",
      "shippingCountry": "DE",
      "shippingPhone": "+49 123 456789",
      "billingName": "Test Customer",
      "billingAddress": "Teststr. 1",
      "billingCity": "Teststadt",
      "billingPostalCode": "12345",
      "billingCountry": "DE",
      "shippingMethodId": null,
      "couponCode": null
    }
  }
}
JSON
)

ORDER_RESP=$(curl -sS "$BASE_URL" \
  -H 'Content-Type: application/json' \
  -d "$CREATE_ORDER_PAYLOAD") || fail "createShopOrder request failed."

if echo "$ORDER_RESP" | jq -e '.errors' >/dev/null; then
  echo "$ORDER_RESP" | jq -r '.errors'
  fail "createShopOrder returned GraphQL errors."
fi

ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.id')
ORDER_TOTAL=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.total')
ORDER_STATUS=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.status')
PAYMENT_STATUS=$(echo "$ORDER_RESP" | jq -r '.data.createShopOrder.paymentStatus')

if [[ -z "$ORDER_ID" || "$ORDER_ID" == "null" ]]; then
  echo "$ORDER_RESP" | jq -r '.'
  fail "Could not extract order ID from createShopOrder response."
fi

pass "Order created: id=$ORDER_ID total=$ORDER_TOTAL status=$ORDER_STATUS paymentStatus=$PAYMENT_STATUS"

# 2) Create payment for the order
log "Creating payment for order..."

AMOUNT="$ORDER_TOTAL"

CREATE_PAYMENT_PAYLOAD=$(cat <<JSON
{
  "query": "mutation CreateOrderPayment(\$input: CreatePaymentInput!) { createPayment(input: \$input) { id orderId amount currency status method createdAt } }",
  "variables": {
    "input": {
      "orderId": "$ORDER_ID",
      "amount": $AMOUNT,
      "currency": "EUR",
      "method": "Cash",
      "transactionId": "TEST-TX-$(date +%s)"
    }
  }
}
JSON
)

PAYMENT_RESP=$(curl -sS "$BASE_URL" \
  -H 'Content-Type: application/json' \
  -d "$CREATE_PAYMENT_PAYLOAD") || fail "createPayment request failed."

if echo "$PAYMENT_RESP" | jq -e '.errors' >/dev/null; then
  echo "$PAYMENT_RESP" | jq -r '.errors'
  fail "createPayment returned GraphQL errors."
fi

PAYMENT_ID=$(echo "$PAYMENT_RESP" | jq -r '.data.createPayment.id')
PAYMENT_STATUS_INIT=$(echo "$PAYMENT_RESP" | jq -r '.data.createPayment.status')

if [[ -z "$PAYMENT_ID" || "$PAYMENT_ID" == "null" ]]; then
  echo "$PAYMENT_RESP" | jq -r '.'
  fail "Could not extract payment ID from createPayment response."
fi

pass "Payment created: id=$PAYMENT_ID status=$PAYMENT_STATUS_INIT amount=$AMOUNT EUR"

# 3) Process payment (this should trigger invoice + document generation)
log "Processing payment..."

PROCESS_PAYMENT_PAYLOAD=$(cat <<JSON
{
  "query": "mutation ProcessPayment(\$paymentId: UUID!) { processPayment(paymentId: \$paymentId) { id orderId amount currency status method } }",
  "variables": {
    "paymentId": "$PAYMENT_ID"
  }
}
JSON
)

PROCESS_RESP=$(curl -sS "$BASE_URL" \
  -H 'Content-Type: application/json' \
  -d "$PROCESS_PAYMENT_PAYLOAD") || fail "processPayment request failed."

if echo "$PROCESS_RESP" | jq -e '.errors' >/dev/null; then
  echo "$PROCESS_RESP" | jq -r '.errors'
  fail "processPayment returned GraphQL errors."
fi

PAYMENT_STATUS_FINAL=$(echo "$PROCESS_RESP" | jq -r '.data.processPayment.status')

if [[ "$PAYMENT_STATUS_FINAL" != "COMPLETED" ]]; then
  echo "$PROCESS_RESP" | jq -r '.'
  fail "Expected processed payment status COMPLETED, got $PAYMENT_STATUS_FINAL"
fi

pass "Payment processed successfully: status=$PAYMENT_STATUS_FINAL"

# 4) Verify order payment status and documents
log "Verifying order payment status and documents..."

GET_ORDER_PAYLOAD=$(cat <<JSON
{
  "query": "query GetOrderWithDocuments(\$id: UUID!) { shopOrder(id: \$id) { id orderNumber status paymentStatus total customerId payments { id amount currency status method transactionId } documents { id documentType state pdfUrl generatedAt templateKey } } }",
  "variables": {
    "id": "$ORDER_ID"
  }
}
JSON
)

ORDER_CHECK_RESP=$(curl -sS "$BASE_URL" \
  -H 'Content-Type: application/json' \
  -d "$GET_ORDER_PAYLOAD") || fail "shopOrder query failed."

if echo "$ORDER_CHECK_RESP" | jq -e '.errors' >/dev/null; then
  echo "$ORDER_CHECK_RESP" | jq -r '.errors'
  fail "shopOrder returned GraphQL errors."
fi

ORDER_PAYMENT_STATUS=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.paymentStatus')
DOC_COUNT=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.documents | length')
COMPLETED_PAYMENTS=$(echo "$ORDER_CHECK_RESP" | jq -r '.data.shopOrder.payments[]?.status' | grep -c 'COMPLETED' || true)

if [[ "$ORDER_PAYMENT_STATUS" != "PAID" ]]; then
  echo "$ORDER_CHECK_RESP" | jq -r '.'
  fail "Expected order paymentStatus PAID, got $ORDER_PAYMENT_STATUS"
fi

if [[ "$COMPLETED_PAYMENTS" -lt 1 ]]; then
  echo "$ORDER_CHECK_RESP" | jq -r '.'
  fail "Expected at least one COMPLETED payment on order, found $COMPLETED_PAYMENTS"
fi

if [[ "$DOC_COUNT" -lt 1 ]]; then
  echo "$ORDER_CHECK_RESP" | jq -r '.'
  fail "Expected at least one generated document for order, found $DOC_COUNT"
fi

pass "Order verification passed: paymentStatus=$ORDER_PAYMENT_STATUS, documents=$DOC_COUNT, completedPayments=$COMPLETED_PAYMENTS"

echo
pass "Order-to-invoice flow test completed successfully."
