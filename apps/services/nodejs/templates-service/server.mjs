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
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        last_modified_by VARCHAR(255),
        UNIQUE(key, company_id)
      );
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
      cancellation: 'cancellation',
      refund: 'refund',
    };

    const documentType = documentTypeMap[key] || 'invoice';
    const name = key.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    let assignedState = null;
    if (documentType === 'invoice' || documentType === 'orderConfirmation') {
      assignedState = 'confirmed';
    } else if (documentType === 'shippingNotice') {
      assignedState = 'shipped';
    } else if (documentType === 'cancellation') {
      assignedState = 'cancelled';
    } else if (documentType === 'refund') {
      assignedState = 'refunded';
    }

    const id = uuidv4();
    const now = new Date();

    try {
      await pool.query(
        `INSERT INTO templates (id, company_id, key, name, content, language, document_type, assigned_state, is_active, metadata, created_at, updated_at, created_by, last_modified_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (key, company_id) DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at`,
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
          JSON.stringify({ version: 1 }),
          now,
          now,
          'system',
          'system',
        ]
      );
      console.log(`✓ Seeded template: ${name}`);
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
  let out = src;

  // Process each section {#name} ... {#end}
  const sectionOpenRegex = /\{#([a-zA-Z0-9_.]+)\}/g;
  let match;
  while ((match = sectionOpenRegex.exec(out)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    const afterOpen = startIndex + match[0].length;
    const endToken = '{#end}';
    const endIndex = out.indexOf(endToken, afterOpen);
    if (endIndex === -1) break; // no matching end

    const blockContent = out.substring(afterOpen, endIndex);

    // Replace {name.prop} inside block with {{prop}}
    const innerReplaced = blockContent.replace(new RegExp('\\{' + name.replace('.', '\\.') + '\\.([a-zA-Z0-9_\\.\\-]+)\\}', 'g'), '{{$1}}');

    // Replace entire block with Mustache section
    out = out.slice(0, startIndex) + `{{#${name}}}` + innerReplaced + `{{/${name}}}` + out.slice(endIndex + endToken.length);

    // Reset regex search to after replaced block to continue
    sectionOpenRegex.lastIndex = startIndex + 1;
  }

  // Convert any remaining single-brace variables {a.b} -> {{a.b}}
  out = out.replace(/\{([a-zA-Z_][a-zA-Z0-9_\.\-]*)\}/g, '{{$1}}');

  return out;
}

// Fallback renderer when Mustache is not available: expand loops and variables
function renderWithoutMustache(src, ctx, errorsList) {
  let out = src;

  // Handle loop blocks {#items} ... {#end}
  const loopRegex = /\{#([a-zA-Z0-9_.]+)\}([\s\S]*?)\{#end\}/g;
  out = out.replace(loopRegex, (m, name, block) => {
    const arr = name.split('.').reduce((acc, k) => (acc && acc[k] ? acc[k] : null), ctx);
    if (!Array.isArray(arr)) {
      errorsList.push(`Missing collection: ${name}`);
      return '';
    }

    const renderedItems = arr.map((item) => {
      // For each item, replace occurrences of {item.prop} or {prop} inside block
      return block.replace(/\{{1,2}\s*([a-zA-Z_][a-zA-Z0-9_\.\-]*)\s*\}{1,2}/g, (match, path) => {
        // If path starts with item. or the loop name prefix, strip it
        let p = path;
        const prefix = name + '.';
        if (p.startsWith(prefix)) p = p.slice(prefix.length);
        if (p.startsWith('item.')) p = p.slice(5);

        const segments = p.split('.');
        let value = item;
        for (const seg of segments) {
          if (value == null || typeof value !== 'object' || !(seg in value)) {
            // Try global context as fallback
            value = ctx;
            for (const s of segments) {
              if (value == null || typeof value !== 'object' || !(s in value)) {
                return match; // keep placeholder
              }
              value = value[s];
            }
            break;
          }
          value = value[seg];
        }
        return String(value);
      });
    });

    return renderedItems.join('\n');
  });

  // Replace remaining variables {a.b} or {{a.b}}
  out = out.replace(/\{{1,2}\s*([a-zA-Z_][a-zA-Z0-9_\.\-]*)\s*\}{1,2}/g, (match, path) => {
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

  return out;
}

// Helper function to format database rows to API response format
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
    isActive: row.is_active,
    metadata: row.metadata,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    createdBy: row.created_by,
    lastModifiedBy: row.last_modified_by,
  };
}

// Provide sample context records for preview selections
app.get('/api/templates/context-samples', (req, res) => {
  const samples = {
    orders: [
      {
        id: 'order-1',
        number: 'ORD-1001',
        date: new Date().toISOString(),
        status: 'confirmed',
        customer: { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
        items: [
          { index: 1, name: 'Product A', quantity: 2, unitPrice: 50, total: 100 },
          { index: 2, name: 'Product B', quantity: 1, unitPrice: 75, total: 75 },
        ],
        subtotal: 175,
        tax: 17.5,
        shipping: 10,
        discount: 0,
        total: 202.5,
        billing: { name: 'John Doe', street: '123 Main St', city: 'Springfield', postalCode: '12345', country: 'USA' },
        shippingAddr: { name: 'John Doe', street: '123 Main St', city: 'Springfield', postalCode: '12345', country: 'USA' },
      },
    ],
    companies: [
      { id: 'comp-1', name: 'ACME Corp', address: '456 Business Ave', city: 'New York', postalCode: '10001', country: 'USA', email: 'info@acme.com', phone: '+1234567890' },
    ],
    invoices: [
      { id: 'inv-1', number: 'INV-1001', date: new Date().toISOString(), subtotal: 175, tax: 17.5, shipping: 10, discount: 0, total: 202.5, notes: 'Thanks for your business' },
    ],
    shipments: [
      { id: 'ship-1', number: 'SHP-1001', date: new Date().toISOString(), carrier: 'DHL', trackingNumber: 'TRK123456' },
    ],
    cancellations: [
      { id: 'can-1', number: 'CAN-1001', date: new Date().toISOString(), reason: 'Customer requested', refundAmount: 50, method: 'credit_card' },
    ],
    refunds: [
      { id: 'ref-1', number: 'REF-1001', date: new Date().toISOString(), amount: 50, reason: 'Product defect', method: 'bank_transfer' },
    ],
  };
  res.json(samples);
});

// Health check
app.get('/actuator/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'UP', components: { db: { status: 'UP' } } });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', components: { db: { status: 'DOWN' } } });
  }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const { companyId, language, documentType } = req.query;

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
      companyId,
      createdBy,
    } = req.body;

    const id = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO templates (id, company_id, key, name, content, language, document_type, assigned_state, is_active, metadata, created_at, updated_at, created_by, last_modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        true,
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
    const { name, content, language, documentType, assignedState, lastModifiedBy } = req.body;
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

    // Normalize template placeholders to Mustache-compatible syntax
    // {var}  -> {{var}}
    // {#items} ... {#end} -> {{#items}} ... {{/items}}
    function normalizeTemplateToMustache(src) {
      // Convert opening section markers {#name} -> {{#name}}
      let out = src.replace(/\{#([a-zA-Z0-9_.]+)\}/g, '{{$1}}');
      // The previous line is temporary; we'll do proper conversions below

      // Convert {#name} to {{#name}} and {#end} to {{/name}} using a stack
      const tokenRegex = /\{#([a-zA-Z0-9_.]+)\}|\{#end\}|\{([a-zA-Z0-9_.]+)\}|\{{2}([^{]+?)\}{2}/g;
      const stack = [];
      out = src.replace(/\{#([a-zA-Z0-9_.]+)\}/g, (m, name) => {
        stack.push(name);
        return `{{#${name}}}`;
      });
      out = out.replace(/\{#end\}/g, (m) => {
        const name = stack.pop() || '';
        return `{{/${name}}}`;
      });

      // Convert single-brace variables {a.b} to Mustache {{a.b}}
      out = out.replace(/\{([a-zA-Z_][a-zA-Z0-9_\.\-]*)\}/g, (m, path) => `{{${path}}}`);

      // Leave existing double-brace placeholders intact
      return out;
    }

    // Apply normalization and then Mustache rendering
    const mustacheTemplate = normalizeTemplateToMustache(template.content);
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

    let renderedAdoc;
    try {
      if (Mustache && typeof Mustache.render === 'function') {
        renderedAdoc = Mustache.render(mustacheTemplate, context);
      } else {
        renderedAdoc = renderWithoutMustache(mustacheTemplate, context, errors);
      }
    } catch (err) {
      console.error('Mustache render error:', err);
      errors.push('Template rendering error');
      renderedAdoc = renderWithoutMustache(mustacheTemplate, context, errors);
    }

    // Try to render AsciiDoc
    let htmlOutput;
    try {
      const Asciidoctor = await import('asciidoctor.js').then((m) =>
        m.default ? m.default() : m()
      );
      const opts = { safe: 'safe', attributes: { showtitle: true } };
      htmlOutput = Asciidoctor.convert(renderedAdoc, opts);
    } catch (err) {
      htmlOutput = `
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
            <div>${renderedAdoc.replace(/</g, '&lt;')}</div>
          </body>
        </html>
      `;
    }

    res.json({
      html: htmlOutput,
      pdfUrl: `http://localhost:8087/api/templates/${template.id}/pdf`,
      errors,
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

    // Normalize and render using Mustache
    const mustacheTemplate = (function normalizeTemplateToMustache(src) {
      const stack = [];
      let out = src.replace(/\{#([a-zA-Z0-9_.]+)\}/g, (m, name) => {
        stack.push(name);
        return `{{#${name}}}`;
      });
      out = out.replace(/\{#end\}/g, (m) => {
        const name = stack.pop() || '';
        return `{{/${name}}}`;
      });
      out = out.replace(/\{([a-zA-Z_][a-zA-Z0-9_\.\-]*)\}/g, (m, path) => `{{${path}}}`);
      return out;
    })(template.content);

    let renderedAdoc;
    try {
      if (Mustache && typeof Mustache.render === 'function') {
        renderedAdoc = Mustache.render(mustacheTemplate, context);
      } else {
        // Use robust fallback when Mustache is not available
        const errorsLocal = [];
        renderedAdoc = renderWithoutMustache(mustacheTemplate, context, errorsLocal);
        if (errorsLocal.length) console.warn('Template renderWithoutMustache warnings:', errorsLocal);
      }
    } catch (err) {
      console.error('Mustache render error:', err);
      return res.status(500).json({ error: 'Template rendering failed' });
    }

    // Write rendered AsciiDoc to temp file
    const tmpDir = tmpdir();
    const adocPath = path.join(tmpDir, `${req.params.id}.adoc`);
    const pdfPath = path.join(tmpDir, `${req.params.id}.pdf`);
    fs.writeFileSync(adocPath, renderedAdoc, 'utf8');

    // Call asciidoctor-pdf CLI if available
    try {
      const spawnResult = spawnSync('asciidoctor-pdf', ['-o', pdfPath, adocPath], { encoding: 'utf8' });
      if (spawnResult.status !== 0) {
        console.error('asciidoctor-pdf failed:', spawnResult.stderr);
        return res.status(500).json({ error: 'PDF generation failed' });
      }

      const pdfBuffer = fs.readFileSync(pdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${template.key}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      return res.status(500).json({ error: 'PDF generation error' });
    } finally {
      // Cleanup temp files if they exist
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

    // Variable replacement
    let content = template.content.replace(
      /\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}/g,
      (match, path) => {
        const segments = path.split('.');
        let value = context;
        for (const segment of segments) {
          if (value == null || typeof value !== 'object' || !(segment in value)) {
            return match;
          }
          value = value[segment];
        }
        return String(value);
      }
    );

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

    // Try PDF generation with asciidoctor-pdf
    try {
      const tmpDir = tmpdir();
      const pdfPath = path.join(tmpDir, `${template.key || 'document'}-${Date.now()}.pdf`);
      const adocPath = path.join(tmpDir, `${template.key || 'document'}-${Date.now()}.adoc`);

      fs.writeFileSync(adocPath, content, 'utf8');

      const result = spawnSync('asciidoctor-pdf', ['-o', pdfPath, adocPath], {
        encoding: 'utf8',
      });

      if (result.status === 0 && fs.existsSync(pdfPath)) {
        const pdfBuffer = fs.readFileSync(pdfPath);

        try {
          fs.unlinkSync(pdfPath);
        } catch (e) {}
        try {
          fs.unlinkSync(adocPath);
        } catch (e) {}

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.pdf"`);
        res.send(pdfBuffer);
        return;
      } else {
        console.warn('asciidoctor-pdf failed', result.stderr || result.stdout);
        try {
          fs.unlinkSync(adocPath);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('asciidoctor-pdf not available or failed', err?.message || err);
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