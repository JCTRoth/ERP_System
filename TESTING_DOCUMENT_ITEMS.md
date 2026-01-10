# Testing Document Generation with Items

This guide helps verify that order items are properly loaded and rendered in generated documents (invoices, order confirmations, etc.).

## Quick Test (Recommended)

Run the Python test script:

```bash
cd /home/jonas/Git/ERP_System
python3 test-document-items.py
```

This will:
1. ✅ Check the test order has items
2. 🔄 Trigger document generation (change status to CONFIRMED)
3. ⏳ Wait for generation to complete
4. ✅ Verify documents were created
5. 📄 Test PDF accessibility

---

## Manual Testing Steps

### 1. Restart Services with Updated Code

First, rebuild and restart the services to pick up the changes:

```bash
cd /home/jonas/Git/ERP_System

# Rebuild services
docker compose build shop-service templates-service

# Restart services
docker compose up -d shop-service templates-service

# Wait for services to be ready
sleep 5
```

### 2. Check Order Has Items

Query the order to verify it has items:

```bash
curl -X POST http://localhost:5003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ order(id: \"ae89dee2-9231-4711-b114-0c03ae96e6d2\") { orderNumber status items { productName sku quantity unitPrice total } } }"
  }' | jq '.'
```

Expected: Should show array of items with product details.

### 3. Trigger Document Generation

Change order status to trigger document generation:

```bash
curl -X POST http://localhost:5003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { updateOrderStatus(id: \"ae89dee2-9231-4711-b114-0c03ae96e6d2\", status: CONFIRMED) { id status } }"
  }' | jq '.'
```

### 4. Wait and Check Documents

Wait a few seconds, then check if documents were generated:

```bash
# Wait for background processing
sleep 10

# Check documents
curl -X POST http://localhost:5003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ order(id: \"ae89dee2-9231-4711-b114-0c03ae96e6d2\") { documents { documentType state pdfUrl generatedAt templateKey } } }"
  }' | jq '.'
```

Expected: Should show generated documents with PDF URLs.

### 5. Verify Items in Logs

Check that items were sent to the templates service:

```bash
# View payload preview in ShopService logs
docker compose logs shop-service | grep -A 10 "TemplatesService payload preview"

# Check templates service for rendering
docker compose logs templates-service | grep -i "items\|missing\|generated"
```

Expected: Logs should show the items array in the payload.

### 6. Verify in Database

Check the database directly:

```bash
# Check order items
docker compose exec postgres psql -U erp_shop -d shopdb -c \
  "SELECT product_name, sku, quantity, unit_price, total FROM order_items WHERE order_id = 'ae89dee2-9231-4711-b114-0c03ae96e6d2';"

# Check generated documents
docker compose exec postgres psql -U erp_shop -d shopdb -c \
  "SELECT document_type, state, template_key, generated_at FROM order_documents WHERE order_id = 'ae89dee2-9231-4711-b114-0c03ae96e6d2' ORDER BY generated_at DESC;"

# Or use the verification SQL script
docker compose exec -T postgres psql -U erp_shop -d shopdb < verify-items.sql
```

### 7. Download and Inspect PDF

Get the PDF URL from step 4 and download it:

```bash
# Extract PDF URL (replace with actual URL from step 4)
PDF_URL="http://localhost:9000/erp-bucket/orders/ae89dee2-9231-4711-b114-0c03ae96e6d2/order-confirmation-20260110-123456.pdf"

# Download PDF
curl -o test-document.pdf "$PDF_URL"

# Open PDF to verify items are rendered
# On Linux:
xdg-open test-document.pdf
# On macOS:
# open test-document.pdf
```

**What to verify in the PDF:**
- ✅ Items table is present
- ✅ All order items are listed
- ✅ Item details are correct (description, SKU, quantity, unit price, total)
- ✅ Discount and tax columns show correct values
- ✅ Item count matches the order

---

## Troubleshooting

### No documents generated

1. **Check ShopService logs:**
   ```bash
   docker compose logs --tail=100 shop-service
   ```
   Look for:
   - "Enqueued document generation job"
   - "TemplatesService payload preview"
   - HTTP errors or timeouts

2. **Check templates-service logs:**
   ```bash
   docker compose logs --tail=100 templates-service
   ```
   Look for:
   - "Missing variables" or "Missing collections"
   - Template rendering errors
   - PDF generation errors

3. **Verify templates were reloaded:**
   ```bash
   docker compose logs templates-service | grep "Seeded template"
   ```

### Items not showing in PDF

1. **Verify payload structure:**
   ```bash
   docker compose logs shop-service | grep "TemplatesService payload preview" | tail -1
   ```
   Should show `items` array at top level with fields: `index`, `description`, `sku`, `quantity`, `unitPrice`, `discount`, `tax`, `total`

2. **Check template syntax:**
   All templates should use:
   ```asciidoc
   {#items}
   | {index}
   | {description}
   | {sku}
   | {quantity}
   | ${unitPrice}
   | ${total}
   {/items}
   ```

3. **Verify templates updated:**
   ```bash
   # Check one template
   cat apps/services/nodejs/templates-service/templates/order-confirmation.adoc | grep -A 10 "items"
   ```

### Services not starting

```bash
# Check service status
docker compose ps

# Restart specific service
docker compose restart shop-service

# View full logs
docker compose logs -f shop-service templates-service
```

---

## What Changed

### ShopService Payload
- Added `items` array at top level (in addition to `order.items`)
- Added `shipping` object with address details
- Added `order` alias (mirrors `invoice` structure)
- Increased HTTP client timeout to 5 minutes
- Added retry policy for templates service calls
- Added debug logging to show payload sent to templates service

### Templates (All 5 Updated)
- Changed loop syntax: `{#order.items}...{#end}` → `{#items}...{/items}`
- Changed item references: `{item.name}` → `{description}`
- Added available fields: `index`, `description`, `sku`, `productId`, `quantity`, `unitPrice`, `discount`, `tax`, `total`
- Enhanced invoice and order-confirmation with 8-column tables (added discount and tax columns)

### Files Modified
- `/apps/services/dotnet/ShopService/Services/OrderDocumentGenerationService.cs` - Payload structure
- `/apps/services/dotnet/ShopService/Program.cs` - HTTP client config
- `/apps/services/nodejs/templates-service/templates/order-confirmation.adoc`
- `/apps/services/nodejs/templates-service/templates/invoice.adoc`
- `/apps/services/nodejs/templates-service/templates/shipping-notice.adoc`
- `/apps/services/nodejs/templates-service/templates/cancellation.adoc`
- `/apps/services/nodejs/templates-service/templates/refund.adoc`

---

## Expected Results

✅ **Success Indicators:**
- Order has 2+ items in database
- Document generation job enqueued (in logs)
- Payload preview shows `items` array with all fields
- Templates service generates PDF without "missing variables" errors
- `order_documents` table has new row(s)
- GraphQL query returns documents with `pdfUrl`
- PDF contains items table with all order items
- Items show correct details (description, SKU, qty, prices)

❌ **Failure Indicators:**
- "No templates found for order state" in logs
- "Missing collection: items" in templates-service logs
- HTTP timeout errors in ShopService logs
- Empty `documents` array in GraphQL response
- No rows in `order_documents` table
- PDF generated but items table is empty

---

## Next Steps After Successful Test

1. Test other order states (SHIPPED, DELIVERED, REFUNDED)
2. Verify email notifications include correct PDFs
3. Test with different item quantities and prices
4. Verify discount and tax calculations in PDFs
5. Test with orders containing many items (pagination)
6. Deploy to production environment
