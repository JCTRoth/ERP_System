import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store
const templates = new Map();

// Mock available variables
const availableVariables = {
  order: {
    id: 'UUID',
    number: 'string',
    date: 'ISO8601 timestamp',
    status: 'string',
    customer: 'object',
    items: 'array',
    subtotal: 'number',
    tax: 'number',
    shipping: 'number',
    total: 'number',
  },
  company: {
    name: 'string',
    address: 'string',
    city: 'string',
    postalCode: 'string',
    country: 'string',
    email: 'string',
    phone: 'string',
  },
};

// Initialize with sample templates
templates.set('sample-invoice-1', {
  id: 'sample-invoice-1',
  companyId: '1',
  key: 'invoice',
  name: 'Invoice Template',
  content: `= Invoice #{order.number}

Company: {{company.name}}
Address: {{company.address}}, {{company.city}}
Date: {{order.date}}

== Items
{{order.items}}

Subtotal: {{order.subtotal}}
Tax: {{order.tax}}
Shipping: {{order.shipping}}
Total: {{order.total}}`,
  language: 'en',
  documentType: 'invoice',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

templates.set('sample-confirmation-1', {
  id: 'sample-confirmation-1',
  companyId: '1',
  key: 'order_confirmation',
  name: 'Order Confirmation',
  content: `= Order Confirmation

Order Number: {{order.number}}
Order Date: {{order.date}}

Dear {{order.customer}},

Your order has been received and is being processed.
Status: {{order.status}}

Total Amount: {{order.total}}

Thank you for your business!`,
  language: 'en',
  documentType: 'confirmation',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

templates.set('sample-shipping-1', {
  id: 'sample-shipping-1',
  companyId: '1',
  key: 'shipping_label',
  name: 'Shipping Label',
  content: `= Shipping Label

Order: {{order.number}}
Date: {{order.date}}

== Recipient
{{order.customer.name}}
{{order.customer.address}}
{{order.customer.city}}, {{order.customer.postalCode}}
{{order.customer.country}}

== Sender
{{company.name}}
{{company.address}}
{{company.city}}, {{company.postalCode}}
{{company.country}}

Weight: {{order.shipping.weight}} kg
Service: Standard Shipping`,
  language: 'en',
  documentType: 'shipping',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

templates.set('sample-receipt-1', {
  id: 'sample-receipt-1',
  companyId: '1',
  key: 'receipt',
  name: 'Payment Receipt',
  content: `= Payment Receipt

Receipt Number: RCPT-{{order.number}}
Date: {{order.date}}

== Customer Information
Name: {{order.customer.name}}
Email: {{order.customer.email}}

== Order Details
Order Number: {{order.number}}
Payment Date: {{order.date}}

[cols="3,1,1,1", options="header"]
|===
| Item | Quantity | Price | Total

{{#order.items}}
| {{productName}} | {{quantity}} | {{price}} | {{total}}
{{/order.items}}
|===

== Payment Summary
Subtotal: {{order.subtotal}}
Tax: {{order.taxAmount}}
Shipping: {{order.shippingAmount}}
*Total Paid: {{order.total}}*

Thank you for your payment!`,
  language: 'en',
  documentType: 'receipt',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

templates.set('sample-quote-1', {
  id: 'sample-quote-1',
  companyId: '1',
  key: 'quote',
  name: 'Quote Template',
  content: `= Quote

Quote Number: QUOTE-{{order.number}}
Valid Until: {{order.validUntil}}
Date: {{order.date}}

== Customer
{{order.customer.name}}
{{order.customer.company}}
{{order.customer.address}}
{{order.customer.city}}, {{order.customer.postalCode}}
{{order.customer.country}}

== Quoted Items
[cols="2,1,1,1", options="header"]
|===
| Description | Quantity | Unit Price | Total

{{#order.items}}
| {{productName}} | {{quantity}} | {{price}} | {{total}}
{{/order.items}}
|===

== Summary
Subtotal: {{order.subtotal}}
Tax: {{order.taxAmount}}
*Total: {{order.total}}*

Terms: Payment due within 30 days.
Valid for 30 days from quote date.`,
  language: 'en',
  documentType: 'quote',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

templates.set('sample-packing-1', {
  id: 'sample-packing-1',
  companyId: '1',
  key: 'packing_slip',
  name: 'Packing Slip',
  content: `= Packing Slip

Order Number: {{order.number}}
Order Date: {{order.date}}
Ship Date: {{order.shipDate}}

== Ship To
{{order.customer.name}}
{{order.customer.address}}
{{order.customer.city}}, {{order.customer.postalCode}}
{{order.customer.country}}

== Order Items
[cols="1,2,1", options="header"]
|===
| Qty | Description | Notes

{{#order.items}}
| {{quantity}} | {{productName}} | {{notes}}
{{/order.items}}
|===

== Shipping Information
Carrier: {{order.shipping.carrier}}
Tracking Number: {{order.shipping.trackingNumber}}
Service: {{order.shipping.service}}

Please inspect your order upon delivery.`,
  language: 'en',
  documentType: 'packing_slip',
  assignedState: null,
  isActive: true,
  metadata: { version: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system'
});

// Health check
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP', components: { db: { status: 'UP' } } });
});

// Get all templates
app.get('/api/templates', (req, res) => {
  const { companyId, language, documentType } = req.query;
  let result = Array.from(templates.values());

  if (companyId) {
    result = result.filter((t) => t.companyId === companyId);
  }
  if (language) {
    result = result.filter((t) => t.language === language);
  }
  if (documentType) {
    result = result.filter((t) => t.documentType === documentType);
  }

  res.json(result);
});

// Get available variables (must be before /:id route)
app.get('/api/templates/variables', (req, res) => {
  res.json(availableVariables);
});

// Get single template
app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Create template
app.post('/api/templates', (req, res) => {
  const {
    key,
    name,
    content,
    language,
    documentType,
    assignedState,
    companyId,
    createdBy,
  } = req.body;

  const id = uuidv4();
  const now = new Date().toISOString();
  const template = {
    id,
    key,
    name,
    content,
    language,
    documentType,
    assignedState: assignedState || null,
    companyId,
    createdBy,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  templates.set(id, template);
  res.status(201).json(template);
});

// Update template
app.put('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { name, content, language, documentType, assignedState } = req.body;
  const updated = {
    ...template,
    ...(name && { name }),
    ...(content && { content }),
    ...(language && { language }),
    ...(documentType && { documentType }),
    ...(assignedState !== undefined && { assignedState }),
    updatedAt: new Date().toISOString(),
  };

  templates.set(id, updated);
  res.json(updated);
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  if (!templates.has(req.params.id)) {
    return res.status(404).json({ error: 'Template not found' });
  }

  templates.delete(req.params.id);
  res.status(204).send();
});

// Render template
app.post('/api/templates/:id/render', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const context = req.body;
  const errors = [];

  // Replace all {{namespace.key}} variables with context values
  let html = template.content.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, path) => {
    const [namespace, key] = path.split('.');
    const value = context[namespace]?.[key];
    if (value === undefined) {
      errors.push(`Missing variable: ${match}`);
      return match;
    }
    return String(value);
  });

  // Wrap in HTML
  const htmlOutput = `
    <html>
      <head>
        <title>${template.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${template.name}</h1>
        <pre>${html}</pre>
      </body>
    </html>
  `;

  res.json({
    html: htmlOutput,
    pdfUrl: `http://localhost:8087/api/templates/${template.id}/pdf`,
    errors,
  });
});

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  console.log(`Templates Service Mock running on port ${PORT}`);
});
