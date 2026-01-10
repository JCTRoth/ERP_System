Templates Service

This service serves AsciiDoc templates and provides preview and PDF generation endpoints for development.

Running

Install dependencies and start:

```bash
cd apps/services/nodejs/templates-service
npm ci
npm start
```

PDF generation

To generate real PDFs the service calls the `asciidoctor-pdf` CLI if available. Install it with:

```bash
# system ruby gem
sudo gem install asciidoctor-pdf
```

Alternatively run the service inside a container that has `asciidoctor-pdf` installed.

Endpoints

- `GET /api/templates` - list templates
- `GET /api/templates/:id` - get template
- `POST /api/templates/:id/render` - render HTML preview (accepts JSON context)
- `GET /api/templates/:id/pdf?context=...` - returns PDF or HTML fallback
- `GET /api/templates/context-samples` - returns sample records for preview selection
- `GET /api/templates/variables` - returns available template variables and their structure

Template Variables Reference

The template service supports a comprehensive set of variables that can be used in AsciiDoc templates. Variables use dot notation (e.g., `order.number`, `customer.name`) and support both simple substitution (`{variable}`) and loops (`{#loop}{variable}{#end}`).

## Core Data Objects

### Order Variables
**Source:** Order data from the system

```
{
  id: 'UUID',                     // Order unique identifier
  number: 'string',               // Order number (e.g., "ORD-001")
  date: 'ISO8601 timestamp',      // Order date
  status: 'string',               // Order status (e.g., "CONFIRMED", "SHIPPED")
  customer: 'object',             // Customer information
  items: 'array',                 // Array of order items
  subtotal: 'number',             // Subtotal amount
  tax: 'number',                  // Tax amount
  shipping: 'number',             // Shipping cost
  total: 'number',                // Total amount
  trackingNumber: 'string',       // Shipping tracking number
  shippedAt: 'ISO8601 timestamp', // Shipping date
  notes: 'string'                 // Additional notes
}
```

### Company Variables
**Source:** Company data

```
{
  name: 'string',                 // Company name
  address: 'string',              // Company address
  city: 'string',                 // Company city
  postalCode: 'string',           // Company postal code
  country: 'string',              // Company country
  email: 'string',                // Company email
  phone: 'string'                 // Company phone
}
```

### Customer Variables
**Source:** Customer data

```
{
  id: 'string',                   // Customer ID
  name: 'string',                 // Customer name
  email: 'string',                // Customer email
  phone: 'string',                // Customer phone
  billing: 'object',              // Billing address
  shippingAddr: 'object',         // Shipping address
  shipping: 'object'              // Alternative shipping address
}
```

### Address Variables
**Source:** Customer address data (accessed via `customer.billing` or `customer.shipping`)

```
{
  name: 'string',                 // Address recipient name
  street: 'string',               // Street address
  city: 'string',                 // City
  postalCode: 'string',           // Postal/zip code
  country: 'string'               // Country
}
```

## Calculated and Mapped Variables

### Calculated Variables
- `invoice.taxRate` - Calculated as `(tax / subtotal) * 100`

### Shipment Variables (mapped from order)
- `shipment.number` - Maps to `order.trackingNumber`
- `shipment.trackingNumber` - Maps to `order.trackingNumber`
- `shipment.date` - Maps to `order.shippedAt` or `order.date`
- `shipment.carrier` - Default: "Standard Shipping"
- `shipment.notes` - Maps to `order.notes`

### Shipping Variables (mapped from order address)
- `shipping.name` - From `order.shippingAddress.name`
- `shipping.street` - From `order.shippingAddress.street`
- `shipping.city` - From `order.shippingAddress.city`
- `shipping.postalCode` - From `order.shippingAddress.postalCode`
- `shipping.country` - From `order.shippingAddress.country`

## Variable Resolution Hierarchy

The template service implements intelligent fallback logic:

1. **Direct lookup:** `company.name` → looks for `company.name` in context
2. **Company fallback:** `company.name` → falls back to `companies[0].name` if company not found
3. **Address fallback:** `customer.address.street` → tries `customer.billing.street`, then `customer.shippingAddr.street`, then `customer.shipping.street`
4. **Calculated values:** `invoice.taxRate` → calculated from `invoice.tax` / `invoice.subtotal`
5. **Shipment mapping:** `shipment.trackingNumber` → maps to `order.trackingNumber`
6. **Shipping mapping:** `shipping.street` → maps to `order.shippingAddress.street`

## Template Syntax

### Simple Variables
```
Order Number: {order.number}
Customer: {customer.name}
Date: {order.date}
```

### Loops (for arrays like order items)
```
{#order.items}
{index}. {name} - {quantity} x {unitPrice} = {total}
{#end}
```

### Conditional Sections
```
{#order.notes}
Notes: {order.notes}
{#end}
```

## Complete Variable Reference Table

| Variable Path | Type | Description | Example |
|---------------|------|-------------|---------|
| `order.id` | UUID | Order unique identifier | `123e4567-e89b-12d3-a456-426614174000` |
| `order.number` | string | Order reference number | `ORD-001` |
| `order.date` | ISO8601 | Order creation date | `2023-01-15T10:30:00Z` |
| `order.status` | string | Order status | `CONFIRMED` |
| `order.subtotal` | number | Subtotal amount | `100.00` |
| `order.tax` | number | Tax amount | `19.00` |
| `order.shipping` | number | Shipping cost | `5.99` |
| `order.total` | number | Total amount | `124.99` |
| `order.trackingNumber` | string | Shipping tracking number | `TRK123456789` |
| `company.name` | string | Company name | `Acme Corp` |
| `company.address` | string | Company address | `123 Main St` |
| `company.city` | string | Company city | `New York` |
| `company.postalCode` | string | Company postal code | `10001` |
| `company.country` | string | Company country | `USA` |
| `company.email` | string | Company email | `info@acme.com` |
| `company.phone` | string | Company phone | `+1 212-555-1234` |
| `customer.name` | string | Customer name | `John Doe` |
| `customer.email` | string | Customer email | `john@example.com` |
| `customer.billing.street` | string | Billing street | `456 Oak Ave` |
| `customer.shipping.city` | string | Shipping city | `Boston` |
| `invoice.taxRate` | number | Calculated tax rate | `19` |
| `shipment.trackingNumber` | string | Tracking number | `TRK123456789` |
| `shipping.street` | string | Shipping street | `789 Pine Rd` |

## Example Templates

### Invoice Template
```asciidoc
= INVOICE {order.number}
:doctype: book
:toc:

== Company Information
**{company.name}**
{company.address}
{company.city}, {company.postalCode}
{company.country}

Email: {company.email}
Phone: {company.phone}

== Customer Information
**{customer.name}**
{customer.billing.street}
{customer.billing.city}, {customer.billing.postalCode}
{customer.billing.country}

Email: {customer.email}

== Order Details
*Order Number:* {order.number}
*Order Date:* {order.date}
*Status:* {order.status}

== Items

[cols="1,3,1,1,1", options="header"]
|===
| # | Description | Quantity | Unit Price | Total

{#order.items}
| {index} | {name} | {quantity} | {unitPrice} | {total} 
{#end}
|===

== Summary
*Subtotal:* {order.subtotal}
*Tax ({invoice.taxRate}%):* {order.tax}
*Shipping:* {order.shipping}
*Total:* {order.total}

== Shipping Information
*Tracking Number:* {shipment.trackingNumber}
*Carrier:* {shipment.carrier}
*Shipping Address:*
{shipping.name}
{shipping.street}
{shipping.city}, {shipping.postalCode}
{shipping.country}

== Notes
{#order.notes}
{order.notes}
{#end}
```

### Order Confirmation Template
```asciidoc
= ORDER CONFIRMATION {order.number}
:doctype: book

Dear {customer.name},

Thank you for your order! Here are the details:

== Order Summary
*Order Number:* {order.number}
*Order Date:* {order.date}
*Status:* {order.status}

== Items Ordered

{#order.items}
- {name} ({quantity} x {unitPrice} = {total})
{#end}

== Totals
*Subtotal:* {order.subtotal}
*Tax:* {order.tax}
*Shipping:* {order.shipping}
*Total:* {order.total}

== Shipping Information
Your order will be shipped to:

{shipping.name}
{shipping.street}
{shipping.city}, {shipping.postalCode}
{shipping.country}

We will notify you when your order ships with tracking number {shipment.trackingNumber}.

Thank you for shopping with {company.name}!

Best regards,
The {company.name} Team
{company.email}
{company.phone}
```

## Best Practices

1. **Use loops for repetitive data** like order items
2. **Leverage calculated variables** like `invoice.taxRate` for derived values
3. **Use conditional sections** to handle optional data like notes
4. **Test with sample data** using the `/context-samples` endpoint
5. **Check available variables** using the `/variables` endpoint
6. **Use AsciiDoc tables** for structured data presentation
7. **Include company branding** using company variables
