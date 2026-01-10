#!/bin/bash
# Test script to verify order items are properly loaded and rendered in documents

set -e

echo "🧪 Testing Document Generation with Items"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test order ID (from previous work)
ORDER_ID="ae89dee2-9231-4711-b114-0c03ae96e6d2"
SHOP_GRAPHQL="http://localhost:5003/graphql"

echo "📋 Step 1: Check current order status and items"
echo "------------------------------------------------"
ORDER_QUERY=$(cat <<'EOF'
{
  order(id: "ae89dee2-9231-4711-b114-0c03ae96e6d2") {
    id
    orderNumber
    status
    total
    items {
      id
      productName
      sku
      quantity
      unitPrice
      total
    }
    documents {
      id
      documentType
      state
      pdfUrl
      generatedAt
      templateKey
    }
  }
}
EOF
)

CURRENT_ORDER=$(curl -s -X POST "$SHOP_GRAPHQL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$(echo $ORDER_QUERY | tr '\n' ' ')\"}")

echo "$CURRENT_ORDER" | jq '.'

ITEM_COUNT=$(echo "$CURRENT_ORDER" | jq '.data.order.items | length')
DOC_COUNT=$(echo "$CURRENT_ORDER" | jq '.data.order.documents | length')
CURRENT_STATUS=$(echo "$CURRENT_ORDER" | jq -r '.data.order.status')

echo ""
echo -e "${YELLOW}Current Status:${NC} $CURRENT_STATUS"
echo -e "${YELLOW}Items Count:${NC} $ITEM_COUNT"
echo -e "${YELLOW}Documents Count:${NC} $DOC_COUNT"
echo ""

if [ "$ITEM_COUNT" = "0" ] || [ "$ITEM_COUNT" = "null" ]; then
  echo -e "${RED}❌ ERROR: Order has no items!${NC}"
  echo "Please ensure the order has items before testing document generation."
  exit 1
fi

echo "✅ Order has $ITEM_COUNT items"
echo ""

echo "📋 Step 2: Rebuild and restart services"
echo "----------------------------------------"
echo "Rebuilding shop-service and templates-service..."
docker compose build shop-service templates-service
echo ""
echo "Restarting services..."
docker compose up -d shop-service templates-service
echo ""
echo "Waiting 5 seconds for services to be ready..."
sleep 5
echo "✅ Services restarted"
echo ""

echo "📋 Step 3: Trigger document generation (change status to CONFIRMED)"
echo "--------------------------------------------------------------------"
MUTATION=$(cat <<'EOF'
mutation {
  updateOrderStatus(id: "ae89dee2-9231-4711-b114-0c03ae96e6d2", status: CONFIRMED) {
    id
    status
    documents {
      id
      documentType
      state
      templateKey
      generatedAt
    }
  }
}
EOF
)

RESULT=$(curl -s -X POST "$SHOP_GRAPHQL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$(echo $MUTATION | tr '\n' ' ')\"}")

echo "$RESULT" | jq '.'
echo ""

NEW_STATUS=$(echo "$RESULT" | jq -r '.data.updateOrderStatus.status')
echo -e "${GREEN}✅ Order status changed to: $NEW_STATUS${NC}"
echo ""

echo "📋 Step 4: Wait for document generation (5 seconds)"
echo "----------------------------------------------------"
sleep 5
echo ""

echo "📋 Step 5: Check generated documents"
echo "-------------------------------------"
DOCS_RESULT=$(curl -s -X POST "$SHOP_GRAPHQL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$(echo $ORDER_QUERY | tr '\n' ' ')\"}")

NEW_DOC_COUNT=$(echo "$DOCS_RESULT" | jq '.data.order.documents | length')
echo "$DOCS_RESULT" | jq '.data.order.documents'
echo ""

if [ "$NEW_DOC_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✅ SUCCESS: Generated $NEW_DOC_COUNT document(s)!${NC}"
else
  echo -e "${RED}❌ FAILED: No documents generated${NC}"
  echo ""
  echo "Checking logs for errors..."
  echo ""
  echo "=== ShopService Logs (last 50 lines) ==="
  docker compose logs --tail=50 shop-service | grep -i "template\|document\|error" || true
  echo ""
  echo "=== TemplatesService Logs (last 50 lines) ==="
  docker compose logs --tail=50 templates-service | grep -i "missing\|error\|generated" || true
  exit 1
fi

echo ""
echo "📋 Step 6: Verify items in ShopService logs"
echo "--------------------------------------------"
echo "Looking for payload preview in logs..."
docker compose logs --tail=100 shop-service | grep -A 5 "TemplatesService payload preview" || echo "No payload preview found (logging may need more time)"
echo ""

echo "📋 Step 7: Check MinIO for generated PDF"
echo "-----------------------------------------"
PDF_URL=$(echo "$DOCS_RESULT" | jq -r '.data.order.documents[0].pdfUrl // empty')
if [ -n "$PDF_URL" ]; then
  echo -e "${GREEN}✅ PDF URL: $PDF_URL${NC}"
  echo ""
  echo "Testing PDF accessibility..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PDF_URL" || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PDF is accessible!${NC}"
  else
    echo -e "${YELLOW}⚠️  PDF returned HTTP $HTTP_STATUS${NC}"
  fi
else
  echo -e "${RED}❌ No PDF URL found${NC}"
fi

echo ""
echo "📋 Step 8: Check database for document records"
echo "-----------------------------------------------"
docker compose exec -T postgres psql -U erp_shop -d shopdb -c \
  "SELECT id, order_id, document_type, state, template_key, generated_at FROM order_documents WHERE order_id = '$ORDER_ID' ORDER BY generated_at DESC LIMIT 5;" \
  || echo "Could not query database"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Document Generation Test Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Order items: $ITEM_COUNT"
echo "  - Documents generated: $NEW_DOC_COUNT"
echo "  - Status: $CURRENT_STATUS → $NEW_STATUS"
echo ""
echo "Next steps:"
echo "  1. Download and open the PDF to verify items are rendered"
echo "  2. Check the template payload in logs to confirm items array structure"
echo "  3. Review templates-service logs for any missing variable warnings"
echo ""
