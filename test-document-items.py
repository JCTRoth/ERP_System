#!/usr/bin/env python3
"""
Quick test to verify items are loaded and rendered in document templates
"""
import requests
import json
import time
import sys

# Configuration
SHOP_GRAPHQL = "http://localhost:5003/graphql"
ORDER_ID = "ae89dee2-9231-4711-b114-0c03ae96e6d2"

def run_query(query):
    """Execute GraphQL query"""
    try:
        response = requests.post(
            SHOP_GRAPHQL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🧪 Testing Document Generation with Items")
    print("=" * 60)
    print()

    # Step 1: Check current order
    print("📋 Step 1: Checking current order...")
    order_query = f"""
    {{
      order(id: "{ORDER_ID}") {{
        id
        orderNumber
        status
        total
        items {{
          id
          productName
          sku
          quantity
          unitPrice
          total
        }}
        documents {{
          id
          documentType
          state
          pdfUrl
          generatedAt
          templateKey
        }}
      }}
    }}
    """
    
    result = run_query(order_query)
    if not result or 'errors' in result:
        print(f"❌ Failed to fetch order: {json.dumps(result, indent=2)}")
        sys.exit(1)
    
    order = result['data']['order']
    items = order.get('items', [])
    documents = order.get('documents', [])
    
    print(f"   Order: {order['orderNumber']}")
    print(f"   Status: {order['status']}")
    print(f"   Items: {len(items)}")
    print(f"   Documents: {len(documents)}")
    print()
    
    if len(items) == 0:
        print("❌ ERROR: Order has no items!")
        print("   Please ensure the order has items before testing.")
        sys.exit(1)
    
    print("✅ Order has items:")
    for idx, item in enumerate(items, 1):
        print(f"   {idx}. {item['productName']} (SKU: {item['sku']}) - Qty: {item['quantity']} @ ${item['unitPrice']}")
    print()

    # Step 2: Trigger document generation
    print("📋 Step 2: Triggering document generation (status → DELIVERED)...")
    mutation = f"""
    mutation {{
      updateOrderStatus(input: {{ orderId: "{ORDER_ID}", status: "DELIVERED" }}) {{
        id
        status
        documents {{
          id
          documentType
          state
          templateKey
          generatedAt
        }}
      }}
    }}
    """
    
    result = run_query(mutation)
    if not result or 'errors' in result:
        print(f"❌ Failed to update status: {json.dumps(result, indent=2)}")
        sys.exit(1)
    
    new_status = result['data']['updateOrderStatus']['status']
    print(f"✅ Status changed to: {new_status}")
    print()

    # Step 3: Wait for document generation
    print("📋 Step 3: Waiting for document generation (10 seconds)...")
    for i in range(10, 0, -1):
        print(f"   {i}...", end='\r')
        time.sleep(1)
    print("   ✓   ")
    print()

    # Step 4: Check generated documents
    print("📋 Step 4: Checking generated documents...")
    result = run_query(order_query)
    if not result or 'errors' in result:
        print(f"❌ Failed to fetch updated order: {json.dumps(result, indent=2)}")
        sys.exit(1)
    
    order = result['data']['order']
    documents = order.get('documents', [])
    
    if len(documents) == 0:
        print("❌ FAILED: No documents generated!")
        print()
        print("🔍 Troubleshooting:")
        print("   1. Check ShopService logs: docker compose logs shop-service | tail -100")
        print("   2. Look for 'TemplatesService payload preview' to see what was sent")
        print("   3. Check templates-service logs: docker compose logs templates-service | tail -100")
        print("   4. Look for 'Missing variables' or generation errors")
        print()
        sys.exit(1)
    
    print(f"✅ SUCCESS: Generated {len(documents)} document(s)!")
    print()
    
    for doc in documents:
        print(f"   📄 {doc['documentType']} ({doc['state']})")
        print(f"      Template: {doc['templateKey']}")
        print(f"      Generated: {doc['generatedAt']}")
        print(f"      PDF: {doc.get('pdfUrl', 'N/A')}")
        print()
    
    # Step 5: Verify PDF accessibility
    if documents and documents[0].get('pdfUrl'):
        print("📋 Step 5: Testing PDF accessibility...")
        pdf_url = documents[0]['pdfUrl']
        try:
            response = requests.head(pdf_url, timeout=5)
            if response.status_code == 200:
                print(f"✅ PDF is accessible at: {pdf_url}")
            else:
                print(f"⚠️  PDF returned HTTP {response.status_code}")
        except Exception as e:
            print(f"⚠️  Could not access PDF: {e}")
        print()
    
    print("=" * 60)
    print("🎉 Test Complete!")
    print("=" * 60)
    print()
    print("📊 Summary:")
    print(f"   ✓ Order has {len(items)} items")
    print(f"   ✓ Generated {len(documents)} document(s)")
    print(f"   ✓ Status: {new_status}")
    print()
    print("🔍 To verify items in PDF:")
    print("   1. Download the PDF from the URL above")
    print("   2. Check that all order items are listed in the PDF")
    print("   3. Verify item details (SKU, quantity, price) match the order")
    print()
    print("📝 To see the exact payload sent to templates service:")
    print("   docker compose logs shop-service | grep 'TemplatesService payload preview'")
    print()

if __name__ == "__main__":
    main()
