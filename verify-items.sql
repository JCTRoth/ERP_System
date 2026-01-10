-- Verify order items and documents in the database
-- Run with: docker compose exec postgres psql -U erp_shop -d shopdb -f /path/to/this/file

\echo '🔍 CHECKING ORDER ITEMS AND DOCUMENTS'
\echo '======================================'
\echo ''

\echo '📦 Order Items for test order:'
\echo '------------------------------'
SELECT 
    oi.id,
    oi.product_name as "Product",
    oi.sku as "SKU",
    oi.quantity as "Qty",
    oi.unit_price as "Unit Price",
    oi.discount_amount as "Discount",
    oi.tax_amount as "Tax",
    oi.total as "Total"
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.order_number = 'ORD-20260109-0002'
ORDER BY oi.id;

\echo ''
\echo '📄 Generated Documents:'
\echo '----------------------'
SELECT 
    od.id,
    od.document_type as "Type",
    od.state as "State",
    od.template_key as "Template",
    od.generated_at as "Generated At",
    CASE 
        WHEN od.pdf_url IS NOT NULL THEN '✅ Yes'
        ELSE '❌ No'
    END as "Has PDF"
FROM order_documents od
JOIN orders o ON od.order_id = o.id
WHERE o.order_number = 'ORD-20260109-0002'
ORDER BY od.generated_at DESC;

\echo ''
\echo '📊 Summary:'
\echo '----------'
SELECT 
    o.order_number as "Order Number",
    o.status as "Status",
    COUNT(DISTINCT oi.id) as "Items Count",
    COUNT(DISTINCT od.id) as "Documents Count",
    SUM(oi.total) as "Items Total"
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN order_documents od ON od.order_id = o.id
WHERE o.order_number = 'ORD-20260109-0002'
GROUP BY o.id, o.order_number, o.status;
