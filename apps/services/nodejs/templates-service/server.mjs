import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { createRequire } from 'module';

// Load Mustache synchronously in ESM using createRequire
const requireCJS = createRequire(import.meta.url);
let Mustache;
try {
  Mustache = requireCJS('mustache');
} catch (err) {
  console.error('Failed to load mustache template engine', err);
  Mustache = null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load shared CSS styles for auto-injection
const sharedStylesPath = path.join(__dirname, 'templates', 'shared-styles.css');
let sharedStyles = '';
try {
  sharedStyles = fs.readFileSync(sharedStylesPath, 'utf8');
  console.log('✓ Loaded shared styles for auto-injection');
} catch (err) {
  console.warn('⚠ Could not load shared-styles.css, templates will render without styling:', err.message);
}

// Helper: Detect theme class based on document type or template key
function getThemeClass(documentType, templateKey) {
  const themeMap = {
    'invoice': 'theme-invoice',
    'orderConfirmation': 'theme-order',
    'shippingNotice': 'theme-shipping',
    'deliveryNote': 'theme-delivery',
    'packingSlip': 'theme-packing',
    'cancellation': 'theme-cancellation',
    'refund': 'theme-refund',
  };
  
  // Try to match by documentType first, then fallback to templateKey
  let theme = themeMap[documentType];
  if (!theme && templateKey) {
    const keyLower = templateKey.toLowerCase().replace(/-/g, '');
    for (const [key, value] of Object.entries(themeMap)) {
      if (keyLower.includes(key.toLowerCase().replace(/confirmation|notice|note|slip/g, ''))) {
        theme = value;
        break;
      }
    }
  }
  
  return theme || 'theme-invoice'; // Default to invoice theme
}

// Helper: Inject CSS into HTML output
function injectStylesIntoHtml(html, themeClass) {
  if (!sharedStyles) return html;
  
  const styleTag = `<style>\n${sharedStyles}\n</style>`;
  const bodyClassInjection = html.replace(/<body([^>]*)>/, `<body$1 class="${themeClass}">`);
  
  // Try to inject into <head>, or before </body>, or at the start
  if (bodyClassInjection.includes('<head>')) {
    return bodyClassInjection.replace('</head>', `${styleTag}\n</head>`);
  } else if (bodyClassInjection.includes('</body>')) {
    return bodyClassInjection.replace('</body>', `${styleTag}\n</body>`);
  } else {
    return styleTag + '\n' + bodyClassInjection;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/templatesdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});


// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(36) PRIMARY KEY,
        company_id VARCHAR(255),
        key VARCHAR(255),
        name VARCHAR(255),
        content TEXT,
        language VARCHAR(10),
        document_type VARCHAR(50),
        assigned_state VARCHAR(50),
        main_object_type VARCHAR(50) DEFAULT 'order',
        is_active BOOLEAN DEFAULT true,
        send_email BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        last_modified_by VARCHAR(255),
        UNIQUE(key, company_id)
      );
    `);
    
    // Add send_email column if it doesn't exist (for existing databases)
    await client.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false;
    `);
    
    // Add main_object_type column if it doesn't exist (for existing databases)
    await client.query(`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS main_object_type VARCHAR(50) DEFAULT 'order';
    `);
    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}


// Mock available variables
const availableVariables = {
  order: {
    id: 'UUID',
    number: 'string',
    date: 'ISO8601 timestamp',
    status: 'string',
    customer: 'object',
    items: 'array',  // This will be populated from order items or line items
    subtotal: 'number',
    tax: 'number',
    shipping: 'number',
    total: 'number',
    trackingNumber: 'string',
    shippedAt: 'ISO8601 timestamp',
  },
  company: {
    name: 'string',
    address: 'string',
    city: 'string',
    postalCode: 'string',
    country: 'string',
    email: 'string',
    phone: 'string',
    taxId: 'string',
    bankName: 'string',
    bankAccount: 'string',
    bankSwift: 'string',
    bankIban: 'string',
    website: 'string',
  },
  customer: {
    name: 'string',
    email: 'string',
    phone: 'string',
    billing: 'object',
    shipping: 'object',
  },
  items: 'array',  // Direct items array for compatibility
  invoice: {
    taxRate: 'number',  // Calculated field
  },
  shipment: {
    trackingNumber: 'string',
    carrier: 'string',
    date: 'ISO8601 timestamp',
  },
  shipping: {
    name: 'string',
    street: 'string',
    city: 'string',
    postalCode: 'string',
    country: 'string',
  },
};

// Load templates from files and seed database
async function loadTemplatesFromFiles() {
  const templatesDir = path.join(__dirname, 'templates');

  if (!fs.existsSync(templatesDir)) {
    console.log('Templates directory not found');
    return;
  }

  const files = fs.readdirSync(templatesDir).filter((file) => file.endsWith('.adoc'));

  for (const file of files) {
    const filePath = path.join(templatesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const key = file.replace('.adoc', '');

    // Map filename to document type
    const documentTypeMap = {
      invoice: 'invoice',
      'order-confirmation': 'orderConfirmation',
      'shipping-notice': 'shippingNotice',
      'delivery-note': 'deliveryNote',
      'packing-slip': 'packingSlip',
      cancellation: 'cancellation',
      refund: 'refund',
    };

    // Map document type to sendEmail flag
    // Cancellation: true, Delivery Note: false, Invoice: true, Order Confirmation: true
    // Packing Slip: false, Refund: true, Shipping Notice: true
    const sendEmailMap = {
      invoice: true,
      orderConfirmation: true,
      shippingNotice: true,
      deliveryNote: false,
      packingSlip: false,
      cancellation: true,
      refund: true,
    };

    const documentType = documentTypeMap[key] || 'invoice';
    const sendEmail = sendEmailMap[documentType] ?? false;
    const name = key.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    let assignedState = null;
    if (documentType === 'invoice' || documentType === 'orderConfirmation') {
      assignedState = 'confirmed';
    } else if (documentType === 'shippingNotice') {
      assignedState = 'shipped';
    } else if (documentType === 'deliveryNote' || documentType === 'packingSlip') {
      assignedState = 'delivered';
    } else if (documentType === 'cancellation') {
      assignedState = 'cancelled';
    } else if (documentType === 'refund') {
      assignedState = 'refunded';
    }

    const id = uuidv4();
    const now = new Date();

    try {
      await pool.query(
        `INSERT INTO templates (id, company_id, key, name, content, language, document_type, assigned_state, is_active, send_email, metadata, created_at, updated_at, created_by, last_modified_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (key, company_id) DO UPDATE SET content = EXCLUDED.content, send_email = EXCLUDED.send_email, updated_at = EXCLUDED.updated_at`,
        [
          id,
          '1',
          key,
          name,
          content,
          'en',
          documentType,
          assignedState,
          true,
          sendEmail,
          JSON.stringify({ version: 1 }),
          now,
          now,
          'system',
          'system',
        ]
      );
      console.log(`✓ Seeded template: ${name} (sendEmail: ${sendEmail})`);
    } catch (err) {
      console.error(`Error seeding template ${name}:`, err);
    }
  }
}

// Initialize database and load templates
async function initialize() {
  try {
    await initializeDatabase();
    await loadTemplatesFromFiles();
    console.log('✓ Templates service initialized');
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

initialize();

// Helper: normalize our custom template syntax to Mustache-compatible template
function normalizeTemplateToMustache(src) {
  // Stack-based scanner to convert {#name}...{#end} into matched Mustache sections
  const outParts = [];
  const stack = [];
  let i = 0;

  while (i < src.length) {
    const endMatch = src.slice(i).match(/^\{#end\}/);
    const openMatch = src.slice(i).match(/^\{#([a-zA-Z0-9_.]+)\}/);
    const varMatch = src.slice(i).match(/^\{([a-zA-Z_][a-zA-Z0-9_.\-]*)\}/);

    if (endMatch) {
      // close last opened section; if none, emit literal
      const last = stack.pop();
      if (last) {
        outParts.push(`{{/${last}}}`);
      } else {
        outParts.push('{#end}');
      }
      i += endMatch[0].length;
      continue;
    }

    if (openMatch) {
      // push current section name and emit opening Mustache tag
      const name = openMatch[1];
      outParts.push(`{{#${name}}}`);
      stack.push(name);
      i += openMatch[0].length;
      continue;
    }

    if (varMatch) {
      outParts.push(`{{${varMatch[1]}}}`);
      i += varMatch[0].length;
      continue;
    }

    // No special token: copy single character
    outParts.push(src[i]);
    i += 1;
  }

  // If stack not empty, close any remaining sections to avoid Mustache parse errors
  while (stack.length) {
    const name = stack.pop();
    outParts.push(`{{/${name}}}`);
  }

  return outParts.join('');
}

// Resolve a dotted path from context with sensible fallbacks
function resolveValue(ctx, path) {
  const segments = path.split('.');

  // Direct lookup
  let value = ctx;
  for (const segment of segments) {
    if (value == null || typeof value !== 'object' || !(segment in value)) {
      value = undefined;
      break;
    }
    value = value[segment];
  }
  if (value !== undefined) return value;

  // Fallbacks
  // company.* -> companies[0].*
  if (segments[0] === 'company' && Array.isArray(ctx.companies) && ctx.companies.length > 0) {
    const rest = segments.slice(1);
    let c = ctx.companies[0];
    for (const seg of rest) {
      if (c == null || typeof c !== 'object' || !(seg in c)) { c = undefined; break; }
      c = c[seg];
    }
    if (c !== undefined) return c;
  }

  // company.* -> check settings.contact for legacy storage
  if (segments[0] === 'company') {
    // check company.settings.contact
    const rest = segments.slice(1);
    const companyObj = Array.isArray(ctx.companies) && ctx.companies.length > 0 ? ctx.companies[0] : ctx.company;
    if (companyObj) {
      const settingsContact = companyObj.settings?.contact || companyObj.settings_json?.contact || (companyObj.settingsJson && companyObj.settingsJson.contact);
      if (settingsContact) {
        let c = settingsContact;
        for (const seg of rest) {
          if (c == null || typeof c !== 'object' || !(seg in c)) { c = undefined; break; }
          c = c[seg];
        }
        if (c !== undefined) return c;
      }
    }
  }

  // customer.address.* -> customer.billing.* or customer.shippingAddr.*
  if (segments.length >= 3 && segments[1] === 'address' && segments[0] === 'customer') {
    const rest = segments.slice(2);
    const tryKeys = ['billing', 'shippingAddr', 'shipping'];
    for (const k of tryKeys) {
      let c = ctx.customer && ctx.customer[k];
      if (!c) continue;
      for (const seg of rest) {
        if (c == null || typeof c !== 'object' || !(seg in c)) { c = undefined; break; }
        c = c[seg];
      }
      if (c !== undefined) return c;
    }
  }

  // invoice.taxRate -> compute from invoice.tax and invoice.subtotal
  if (path === 'invoice.taxRate' && ctx.invoice && typeof ctx.invoice.tax === 'number' && typeof ctx.invoice.subtotal === 'number' && ctx.invoice.subtotal !== 0) {
    return (ctx.invoice.tax / ctx.invoice.subtotal) * 100;
  }

  // order.items -> map to items array (for template compatibility)
  if (path === 'order.items') {
    // Try direct items array first
    if (Array.isArray(ctx.items)) {
      return ctx.items;
    }
    // Try order.items if available
    if (Array.isArray(ctx.order?.items)) {
      return ctx.order.items;
    }
    // Try lineItems as fallback
    if (Array.isArray(ctx.order?.lineItems)) {
      return ctx.order.lineItems;
    }
    // Try orderItems as fallback
    if (Array.isArray(ctx.order?.orderItems)) {
      return ctx.order.orderItems;
    }
    // Return empty array if no items found
    return [];
  }

  // order.items[index].property -> handle item property access
  if (segments[0] === 'order' && segments[1] === 'items' && segments.length > 2) {
    // Get items array using the same logic as above
    const items = (
      Array.isArray(ctx.items) ? ctx.items :
      Array.isArray(ctx.order?.items) ? ctx.order.items :
      Array.isArray(ctx.order?.lineItems) ? ctx.order.lineItems :
      Array.isArray(ctx.order?.orderItems) ? ctx.order.orderItems :
      []
    );
    
    const itemIndex = parseInt(segments[2]);
    if (!isNaN(itemIndex) && itemIndex >= 0 && itemIndex < items.length) {
      const item = items[itemIndex];
      const property = segments.slice(3).join('.');
      if (item && property in item) {
        return item[property];
      }
      // Try common aliases for product name
      if (property === 'name' && !item.name) {
        return item.productName || item.description || item.title || `Item ${itemIndex + 1}`;
      }
      // Try common aliases for SKU
      if (property === 'sku' && !item.sku) {
        return item.productSku || item.code || item.id || 'N/A';
      }
    }
  }

  // shipment.* -> map to order fields
  if (segments[0] === 'shipment' && ctx.order) {
    const shipmentField = segments[1];
    const mapping = {
      'number': ctx.order.trackingNumber,
      'trackingNumber': ctx.order.trackingNumber,
      'date': ctx.order.shippedAt || ctx.order.date,
      'carrier': 'Standard Shipping',
      'notes': ctx.order.notes || ''
    };
    if (shipmentField in mapping) {
      return mapping[shipmentField];
    }
  }

  // shipping.* -> map to order.shippingAddress.*
  if (segments[0] === 'shipping' && ctx.order) {
    const shippingMapping = {
      'name': ctx.order.shippingAddress?.name,
      'street': ctx.order.shippingAddress?.street,
      'city': ctx.order.shippingAddress?.city,
      'postalCode': ctx.order.shippingAddress?.postalCode,
      'country': ctx.order.shippingAddress?.country
    };
    const field = segments[1];
    if (field in shippingMapping && shippingMapping[field] !== undefined) {
      return shippingMapping[field];
    }
  }

  return undefined;
}

// Resolve a path with fallbacks separated by '||' (e.g. 'shipment.date||order.date')
function resolveWithFallback(ctx, path) {
  if (typeof path !== 'string') return undefined;
  const parts = path.split('||').map((p) => p.trim());
  for (const p of parts) {
    const v = resolveValue(ctx, p);
    if (v !== undefined) return v;
    // Also support direct lookup for top-level keys (like 'shipping.name')
    const direct = p.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), ctx);
    if (direct !== undefined) return direct;
  }
  return undefined;
}

// Fallback renderer when Mustache is not available: expand loops and variables
function renderWithoutMustache(src, ctx, errorsList) {
  let out = src;

  // Normalize Mustache-style sections to {#name}...{#end}
  out = out.replace(/\{\{#([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, name, block) => `{#${name}}${block}{#end}`);

  // Process custom loop blocks {#name} ... {#end}
  const loopRegex = /\{#([a-zA-Z0-9_.]+)\}([\s\S]*?)\{#end\}/g;
  out = out.replace(loopRegex, (m, name, block) => {
    const arr = name.split('.').reduce((acc, k) => (acc && acc[k] ? acc[k] : null), ctx);
    console.log('DEBUG: Loop processing - name:', name, 'arr:', arr);
    if (!Array.isArray(arr)) {
      errorsList.push(`Missing collection: ${name}`);
      return '';
    }

    const renderedItems = arr.map((item, idx) => {
      return block.replace(/\{{1,2}\s*([a-zA-Z_][a-zA-Z0-9_\.\-]*)\s*\}{1,2}/g, (match, path) => {
        let p = path;
        const prefix = name + '.';
        if (p.startsWith(prefix)) p = p.slice(prefix.length);
        
        // Handle {index} - return 1-based index
        if (p === 'index') return String(idx + 1);
        
        // Handle {item.property} - look up property in current item
        if (p.startsWith('item.')) {
          const itemPath = p.slice(5); // Remove 'item.' prefix
          const itemValue = itemPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), item);
          console.log('DEBUG: Loop item property resolution - itemPath:', itemPath, 'itemValue:', itemValue);
          if (itemValue !== undefined) return String(itemValue);
          errorsList.push(`Missing variable: ${match}`);
          return match;
        }
        
        // Handle direct property names from the item (e.g., {name}, {quantity})
        const directItemValue = item[p];
        if (directItemValue !== undefined) {
          console.log('DEBUG: Loop direct item property - p:', p, 'value:', directItemValue);
          return String(directItemValue);
        }

        // Fall back to resolving from the full context and support fallback expressions
        const resolved = resolveWithFallback({ ...ctx, item, invoice: ctx.invoice }, p);
        console.log('DEBUG: Loop variable resolution - path:', p, 'resolved:', resolved);
        if (resolved === undefined) {
          errorsList.push(`Missing variable: ${match}`);
          return match;
        }
        return String(resolved);
      });
    });

    return renderedItems.join('\n');
  });

  // Replace remaining variables {a.b} or {{a.b}}
  out = out.replace(/\{{1,2}\s*([^\}]+)\s*\}{1,2}/g, (match, path) => {
    const resolved = resolveWithFallback(ctx, path);
    if (resolved === undefined) {
      errorsList.push(`Missing variable: ${match}`);
      return match;
    }
    return String(resolved);
  });

  return out;
}

// Helper to run asciidoctor-pdf CLI
function runAsciidoctorPdf(adocPath, pdfPath) {
  try {
    const res = spawnSync('asciidoctor-pdf', ['-o', pdfPath, adocPath], { encoding: 'utf8' });
    if (res.status === 0) {
      return { ok: true, stdout: res.stdout || '' };
    }
    return { ok: false, error: res.stderr || res.stdout || `Exit ${res.status}` };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Health check
app.get('/actuator/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'UP', components: { db: { status: 'UP' } } });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', components: { db: { status: 'DOWN' } } });
  }
});

// Helper: format template row from database to API response
function formatTemplate(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    key: row.key,
    name: row.name,
    content: row.content,
    language: row.language,
    documentType: row.document_type,
    assignedState: row.assigned_state,
    mainObjectType: row.main_object_type || 'order',
    isActive: row.is_active,
    sendEmail: row.send_email || false,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    lastModifiedBy: row.last_modified_by,
  };
}

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const { companyId, language, documentType, assignedState } = req.query;

    let query = 'SELECT * FROM templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (companyId) {
      query += ` AND company_id = $${paramIndex++}`;
      params.push(companyId);
    }
    if (language) {
      query += ` AND language = $${paramIndex++}`;
      params.push(language);
    }
    if (documentType) {
      query += ` AND document_type = $${paramIndex++}`;
      params.push(documentType);
    }
    if (assignedState) {
      query += ` AND assigned_state = $${paramIndex++}`;
      params.push(assignedState);
      // When querying by assigned state (ShopService use case), only return active templates
      query += ` AND is_active = $${paramIndex++}`;
      params.push(true);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatTemplate));
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available variables (must be before /:id route)
app.get('/api/templates/variables', (req, res) => {
  res.json(availableVariables);
});

// Get single template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(formatTemplate(result.rows[0]));
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create template
app.post('/api/templates', async (req, res) => {
  try {
    const {
      key,
      name,
      content,
      language,
      documentType,
      assignedState,
      mainObjectType,
      companyId,
      createdBy,
      sendEmail,
      isActive,
    } = req.body;

    const id = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO templates (id, company_id, key, name, content, language, document_type, assigned_state, main_object_type, is_active, send_email, metadata, created_at, updated_at, created_by, last_modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        companyId,
        key,
        name,
        content,
        language || 'en',
        documentType,
        assignedState || null,
        mainObjectType || 'order',
        isActive ?? true,
        sendEmail || false,
        JSON.stringify({ version: 1 }),
        now,
        now,
        createdBy,
        createdBy,
      ]
    );

    res.status(201).json(formatTemplate(result.rows[0]));
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
  try {
    const { name, content, language, documentType, assignedState, mainObjectType, sendEmail, isActive, lastModifiedBy } = req.body;
    const now = new Date();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      params.push(language);
    }
    if (documentType !== undefined) {
      updates.push(`document_type = $${paramIndex++}`);
      params.push(documentType);
    }
    if (assignedState !== undefined) {
      updates.push(`assigned_state = $${paramIndex++}`);
      params.push(assignedState);
    }
    if (mainObjectType !== undefined) {
      updates.push(`main_object_type = $${paramIndex++}`);
      params.push(mainObjectType);
    }
    if (sendEmail !== undefined) {
      updates.push(`send_email = $${paramIndex++}`);
      params.push(sendEmail);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (lastModifiedBy !== undefined) {
      updates.push(`last_modified_by = $${paramIndex++}`);
      params.push(lastModifiedBy);
    }

    params.push(req.params.id);

    const query = `UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(formatTemplate(result.rows[0]));
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Render template
app.post('/api/templates/:id/render', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = formatTemplate(result.rows[0]);
    const context = req.body;
    const errors = [];

      // Use helpers below (normalizeTemplateToMustache / renderWithoutMustache)
    // Fallback simple replacer for environments where Mustache isn't available
    function simpleReplace(src, ctx, errorsList) {
      // Handle both {{var}} and {var} placeholders
      return src.replace(/\{{1,2}\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}{1,2}/g, (match, path) => {
        const segments = path.split('.');
        let value = ctx;
        for (const segment of segments) {
          if (value == null || typeof value !== 'object' || !(segment in value)) {
            errorsList.push(`Missing variable: ${match}`);
            return match;
          }
          value = value[segment];
        }
        return String(value);
      });
    }

    // Debug: log context keys for debugging
    console.log('DEBUG: Template context keys:', Object.keys(context));
    console.log('DEBUG: Template context items length:', Array.isArray(context.items) ? context.items.length : 'not an array');
    console.log('DEBUG: Template context order.items length:', context.order?.items?.length);
    
    // Debug: log first few items if available
    if (Array.isArray(context.items) && context.items.length > 0) {
      console.log('DEBUG: First item:', context.items[0]);
    }
    if (context.order?.items?.length > 0) {
      console.log('DEBUG: First order item:', context.order.items[0]);
    }

    // Use robust fallback renderer directly to avoid Mustache parsing issues
    let renderedAdoc;
    try {
      renderedAdoc = renderWithoutMustache(template.content, context, errors);
    } catch (err) {
      console.error('Fallback render error in /render:', err);
      errors.push('Template rendering error');
      renderedAdoc = template.content;
    }

    // Try to render AsciiDoc
    let htmlOutput;
    try {
      const Asciidoctor = await import('asciidoctor.js').then((m) =>
        m.default ? m.default() : m()
      );
      const opts = { safe: 'safe', attributes: { showtitle: true } };
      htmlOutput = Asciidoctor.convert(renderedAdoc, opts);
      // Clean up PDF-only placeholders for HTML preview
      htmlOutput = htmlOutput.replace(/\{page-number\}/g, '').replace(/\{page-count\}/g, '');
      
      // Auto-inject shared styles
      const themeClass = getThemeClass(template.documentType, template.key);
      htmlOutput = injectStylesIntoHtml(htmlOutput, themeClass);
    } catch (err) {
      const themeClass = getThemeClass(template.documentType, template.key);
      htmlOutput = `
        <html>
          <head>
            <title>${template.name}</title>
            <style>${sharedStyles}</style>
          </head>
          <body class="${themeClass}">
            <h1>${template.name}</h1>
            <div>${renderedAdoc.replace(/</g, '&lt;').replace(/\{page-number\}/g, '').replace(/\{page-count\}/g, '')}</div>
          </body>
        </html>
      `;
    }

    // Log missing variables to console instead of returning them
    if (errors.length > 0) {
      console.log(`[Template ${template.id}] Missing variables/collections:`, errors);
    }

    // Use the request host for PDF URL to work in all environments
    const protocol = req.protocol;
    const host = req.get('host') || process.env.PUBLIC_URL || 'localhost:8087';
    const pdfUrl = `${protocol}://${host}/api/templates/${template.id}/pdf`;
    
    res.json({
      html: htmlOutput,
      pdfUrl,
      errors: [], // Don't expose errors in response
    });
  } catch (err) {
    console.error('Error rendering template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST PDF generation endpoint (accepts JSON context and returns application/pdf)
app.post('/api/templates/:id/pdf', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = formatTemplate(result.rows[0]);
    const context = req.body || {};

    // Render using fallback renderer on original template content; prefer Mustache if available
    let renderedAdoc;
    try {
      // Always use renderWithoutMustache for consistent fallback support
      const errorsLocal = [];
      renderedAdoc = renderWithoutMustache(template.content, context, errorsLocal);
      if (errorsLocal.length) console.warn('Template renderWithoutMustache warnings:', errorsLocal);
    } catch (err) {
      console.error('Template render error:', err);
      return res.status(500).json({ error: 'Template rendering failed' });
    }

    // Write rendered AsciiDoc to temp file
    const tmpDir = tmpdir();
    const adocPath = path.join(tmpDir, `${req.params.id}.adoc`);
    const pdfPath = path.join(tmpDir, `${req.params.id}.pdf`);
    fs.writeFileSync(adocPath, renderedAdoc, 'utf8');

    // Prefer asciidoctor-pdf CLI for PDF generation
    try {
      const cliRes = runAsciidoctorPdf(adocPath, pdfPath);
      if (cliRes.ok && fs.existsSync(pdfPath)) {
        const pdfBuffer = fs.readFileSync(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.key}.pdf"`);
        return res.send(pdfBuffer);
      }

      console.warn('asciidoctor-pdf CLI not available or failed:', cliRes.error || cliRes.stdout);

      // Fallback to programmatic AsciiDoc -> HTML -> Puppeteer as before
      let html = '';
      const themeClass = getThemeClass(template.documentType, template.key);
      try {
        const AsciidoctorModule = await import('@asciidoctor/core');
        const AsciidoctorFactory = AsciidoctorModule.default || AsciidoctorModule;
        const Asciidoctor = typeof AsciidoctorFactory === 'function' ? AsciidoctorFactory() : AsciidoctorFactory;
        const opts = { safe: 'safe', attributes: { showtitle: true } };
        html = Asciidoctor.convert(renderedAdoc, opts);
        
        // Auto-inject shared styles
        html = injectStylesIntoHtml(html, themeClass);
      } catch (e) {
        console.warn('Asciidoctor conversion failed, falling back to simple HTML:', e?.message || e);
        html = `
          <html>
            <head>
              <title>${template.name}</title>
              <style>${sharedStyles}</style>
            </head>
            <body class="${themeClass}">
              <h1>${template.name}</h1>
              <div>${renderedAdoc.replace(/</g, '&lt;')}</div>
            </body>
          </html>
        `;
      }

      try {
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.key}.pdf"`);
        return res.send(pdfBuffer);
      } catch (err) {
        console.error('Puppeteer PDF generation failed:', err?.message || err);
        // Fallback: return HTML so clients can still download/open a preview
        try {
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.html"`);
          return res.send(html);
        } catch (e) {
          return res.status(500).json({ error: 'PDF generation failed' });
        }
      }
    } finally {
      try { if (fs.existsSync(adocPath)) fs.unlinkSync(adocPath); } catch (e) {}
      try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (e) {}
    }
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  console.log(`✓ Templates Service running on port ${PORT}`);
});

// PDF generation endpoint
app.get('/api/templates/:id/pdf', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const template = formatTemplate(result.rows[0]);
    let context = {};

    if (req.query.context) {
      try {
        context = JSON.parse(decodeURIComponent(req.query.context));
      } catch (e) {
        console.error('Failed to parse context:', e);
      }
    }

    // Variable replacement using resolveValue fallbacks
    let content = template.content.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}/g, (match, path) => {
      const v = resolveValue(context, path);
      return v === undefined ? match : String(v);
    });

    // Try to render AsciiDoc
    let htmlOutput;
    try {
      const Asciidoctor = await import('asciidoctor.js').then((m) =>
        m.default ? m.default() : m()
      );
      const opts = { safe: 'safe', attributes: { showtitle: true } };
      htmlOutput = Asciidoctor.convert(content, opts);
    } catch (err) {
      htmlOutput = `
        <html>
          <head>
            <title>${template.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>${template.name}</h1>
            <div>${content.replace(/</g, '&lt;')}</div>
          </body>
        </html>
      `;
    }

    // Try programmatic AsciiDoc -> HTML -> PDF via Puppeteer
    try {
      // Write temporary files and try asciidoctor-pdf CLI first
      const tmpDir = tmpdir();
      const adocPath = path.join(tmpDir, `${req.params.id}.adoc`);
      const pdfPath = path.join(tmpDir, `${req.params.id}.pdf`);
      fs.writeFileSync(adocPath, content, 'utf8');

      const cliRes = runAsciidoctorPdf(adocPath, pdfPath);
      if (cliRes.ok && fs.existsSync(pdfPath)) {
        const pdfBuffer = fs.readFileSync(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.pdf"`);
        res.send(pdfBuffer);
        try { if (fs.existsSync(adocPath)) fs.unlinkSync(adocPath); } catch (e) {}
        try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (e) {}
        return;
      }

      console.warn('asciidoctor-pdf CLI not available or failed:', cliRes.error || cliRes.stdout);

      let htmlOutputLocal = htmlOutput;

      // If we only have raw AsciiDoc content, try converting it
      if (!htmlOutputLocal || typeof htmlOutputLocal !== 'string') {
        try {
          const AsciidoctorModule = await import('@asciidoctor/core');
          const Asciidoctor = AsciidoctorModule.default || AsciidoctorModule;
          htmlOutputLocal = Asciidoctor.convert(content, { safe: 'safe', attributes: { showtitle: true } });
        } catch (e) {
          htmlOutputLocal = `
            <html>
              <head>
                <title>${template.name}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 40px; }
                  h1 { color: #333; }
                </style>
              </head>
              <body>
                <h1>${template.name}</h1>
                <div>${content.replace(/</g, '&lt;')}</div>
              </body>
            </html>
          `;
        }
      }

      try {
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlOutputLocal, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.pdf"`);
        res.send(pdfBuffer);
        return;
      } catch (err) {
        console.warn('Puppeteer PDF generation failed, falling back to HTML:', err?.message || err);
      }
    } catch (err) {
      console.warn('Programmatic PDF generation failed:', err?.message || err);
    }

    // Fallback to HTML
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.html"`);
    res.send(htmlOutput);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).send('Internal server error');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});