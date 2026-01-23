#!/bin/bash

# Comprehensive template testing script for MediVita demo

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ERP System test data
cat > /tmp/test-data.json << 'EOF'
{
  "company": {
    "id": "1",
    "name": "ERP System Company",
    "address": "123 Business St",
    "postalCode": "12345",
    "city": "Business City",
    "country": "Germany",
    "email": "info@erp-system.com",
    "phone": "+49 123 456789",
    "taxId": "DE-12-3456789",
    "bankName": "Deutsche Bank",
    "bankAccount": "12345678",
    "bankSwift": "DEUTDEBB",
    "bankIban": "DE12345678901234567890",
    "website": "www.erp-system.com"
  },
  "customer": {
    "id": "CUST-001",
    "name": "Max Mustermann GmbH",
    "email": "info@mustermann.de",
    "phone": "+49 987 654321",
    "billing": {
      "street": "Musterstraße 456",
      "postalCode": "54321",
      "city": "Musterstadt",
      "country": "Germany"
    },
    "shipping": {
      "street": "Lieferweg 789",
      "postalCode": "12345",
      "city": "Business City",
      "country": "Germany"
    }
  },
  "shippingAddress": {
    "name": "Max Mustermann GmbH",
    "street": "Lieferweg 789",
    "postalCode": "12345",
    "city": "Business City",
    "country": "Germany",
    "phone": "+49 987 654321"
  },
  "order": {
    "id": "ORDER-001",
    "number": "ORD-2026-0001",
    "date": "2026-01-20",
    "dueDate": "2026-02-20",
    "status": "shipped",
    "paymentMethod": "Credit Card",
    "subtotal": 350.00,
    "tax": 35.00,
    "shipping": 10.00,
    "total": 395.00,
    "notes": "Standard business order - office supplies",
    "trackingNumber": "TRACK689636221",
    "shippedAt": "2026-01-23",
    "items": [
      {
        "id": "ITEM-001",
        "name": "Office Desk Chair",
        "sku": "ODC-ERG-001",
        "description": "Ergonomic Office Desk Chair with Adjustable Height",
        "quantity": 1,
        "unitPrice": 150.00,
        "total": 150.00,
        "notes": "Black leather, adjustable lumbar support"
      },
      {
        "id": "ITEM-002",
        "name": "Wireless Keyboard and Mouse Set",
        "sku": "WKM-BT-200",
        "description": "Bluetooth Wireless Keyboard and Mouse Combo",
        "quantity": 2,
        "unitPrice": 100.00,
        "total": 200.00,
        "notes": "Includes 2 AAA batteries each"
      }
    ],
    "shippingAddress": {
      "name": "Dr. Michael Chen",
      "street": "2530 Main St",
      "postalCode": "91002",
      "city": "New York",
      "country": "USA"
    }
  },
  "shipment": {
    "number": "SHIP-001",
    "date": "2026-01-23",
    "carrier": "DHL Express",
    "trackingNumber": "TRACK689636221",
    "status": "in_transit",
    "notes": "Express overnight delivery"
  },
  "shipping": {
    "name": "Dr. Michael Chen",
    "street": "2530 Main St",
    "postalCode": "91002",
    "city": "New York",
    "country": "USA",
    "phone": "+1-555-987-6543"
  },
  "invoice": {
    "taxRate": 10
  },
  "cancellation": {
    "date": "2026-01-22",
    "reason": "Customer requested",
    "refundAmount": 395.00,
    "method": "Original Payment Method",
    "status": "Processed"
  },
  "refund": {
    "number": "REF-001",
    "date": "2026-01-23",
    "reason": "Product not needed",
    "amount": 395.00,
    "method": "Credit Card"
  }
}
EOF

TEMPLATES_SERVICE="http://localhost:8087"
COMPANY_ID="1"

# Get all templates
echo -e "${BLUE}=== Fetching Templates ===${NC}"
TEMPLATES=$(curl -s "${TEMPLATES_SERVICE}/api/templates?companyId=${COMPANY_ID}")
TEMPLATE_COUNT=$(echo "$TEMPLATES" | jq 'length')

echo -e "${GREEN}Found $TEMPLATE_COUNT templates${NC}"

# Test each template
TEMPLATE_IDS=$(echo "$TEMPLATES" | jq -r '.[] | .id')
TEMPLATE_KEYS=$(echo "$TEMPLATES" | jq -r '.[] | .key')

declare -A template_ids_map
declare -A template_keys_map

i=0
while IFS= read -r id; do
  template_ids_map[$i]="$id"
  ((i++))
done <<< "$TEMPLATE_IDS"

i=0
while IFS= read -r key; do
  template_keys_map[$i]="$key"
  ((i++))
done <<< "$TEMPLATE_KEYS"

TEST_RESULTS_DIR="/tmp/template-tests-$(date +%s)"
mkdir -p "$TEST_RESULTS_DIR"

echo -e "\n${BLUE}=== Testing Templates ===${NC}"
echo -e "Results will be saved to: ${YELLOW}${TEST_RESULTS_DIR}${NC}\n"

DATA=$(cat /tmp/test-data.json)

for i in $(seq 0 $((TEMPLATE_COUNT - 1))); do
  TEMPLATE_ID="${template_ids_map[$i]}"
  TEMPLATE_KEY="${template_keys_map[$i]}"
  
  echo -e "${BLUE}Testing: ${TEMPLATE_KEY}${NC}"
  
  # Test HTML render
  echo -n "  → Rendering HTML... "
  RENDER_RESPONSE=$(curl -s -X POST \
    "${TEMPLATES_SERVICE}/api/templates/${TEMPLATE_ID}/render" \
    -H "Content-Type: application/json" \
    -d "$DATA")
  
  # Check for errors
  ERROR_COUNT=$(echo "$RENDER_RESPONSE" | jq '.errors | length' 2>/dev/null || echo "0")
  HTML_OUTPUT=$(echo "$RENDER_RESPONSE" | jq -r '.html' 2>/dev/null)
  
  if [ -z "$HTML_OUTPUT" ] || [ "$HTML_OUTPUT" == "null" ]; then
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $(echo "$RENDER_RESPONSE" | jq '.' 2>/dev/null | head -5)"
    continue
  fi
  
  echo -e "${GREEN}OK${NC} (${ERROR_COUNT} missing variables)"
  
  # Save HTML to file
  HTML_FILE="${TEST_RESULTS_DIR}/${TEMPLATE_KEY}.html"
  echo "$HTML_OUTPUT" > "$HTML_FILE"
  echo "  → Saved to: ${HTML_FILE}"
  
  # Generate PDF
  echo -n "  → Generating PDF... "
  PDF_RESPONSE=$(curl -s -X POST \
    "${TEMPLATES_SERVICE}/api/templates/${TEMPLATE_ID}/pdf" \
    -H "Content-Type: application/json" \
    -d "$DATA" \
    -w "\n%{http_code}" \
    -o "${TEST_RESULTS_DIR}/${TEMPLATE_KEY}.pdf")
  
  HTTP_CODE=$(tail -n1 <<< "$PDF_RESPONSE")
  
  if [ "$HTTP_CODE" == "200" ]; then
    PDF_SIZE=$(stat -f%z "${TEST_RESULTS_DIR}/${TEMPLATE_KEY}.pdf" 2>/dev/null || stat -c%s "${TEST_RESULTS_DIR}/${TEMPLATE_KEY}.pdf" 2>/dev/null)
    echo -e "${GREEN}OK${NC} ($(numfmt --to=iec $PDF_SIZE 2>/dev/null || echo "$PDF_SIZE bytes"))"
  else
    echo -e "${RED}FAILED${NC} (HTTP $HTTP_CODE)"
  fi
  
  # Check for missing variables in HTML
  MISSING_VARS=$(grep -o '{[^}]*}' "$HTML_FILE" | sort -u | wc -l)
  if [ $MISSING_VARS -gt 0 ]; then
    echo -e "  ${YELLOW}⚠ Found $MISSING_VARS unreplaced variables:${NC}"
    grep -o '{[^}]*}' "$HTML_FILE" | sort -u | sed 's/^/    /'
  fi
  
  echo ""
done

echo -e "${BLUE}=== Summary ===${NC}"
echo "HTML files: ${TEST_RESULTS_DIR}/*.html"
echo "PDF files:  ${TEST_RESULTS_DIR}/*.pdf"
echo ""
echo -e "To view results, open in browser:"
for html_file in ${TEST_RESULTS_DIR}/*.html; do
  echo "  file://${html_file}"
done
