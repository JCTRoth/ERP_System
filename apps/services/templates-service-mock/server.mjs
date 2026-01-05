import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Load templates from files
function loadTemplatesFromFiles() {
  const templatesDir = path.join(__dirname, 'templates');
  
  if (!fs.existsSync(templatesDir)) {
    console.log('Templates directory not found');
    return;
  }

  const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.adoc'));
  
  files.forEach((file, index) => {
    const filePath = path.join(templatesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const key = file.replace('.adoc', '');
    
    // Map filename to document type
    const documentTypeMap = {
      'invoice': 'invoice',
      'order-confirmation': 'orderConfirmation',
      'shipping-notice': 'shippingNotice',
      'cancellation': 'cancellation',
      'refund': 'refund'
    };
    
    const documentType = documentTypeMap[key] || 'invoice';
    const name = key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const template = {
      id: `template-${index + 1}`,
      companyId: '1', // Default company
      key: key,
      name: name,
      content: content,
      language: 'en',
      documentType: documentType,
      assignedState: null,
      isActive: true,
      metadata: { version: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      lastModifiedBy: 'system'
    };
    
    templates.set(template.id, template);
    console.log(`Loaded template: ${template.name}`);
  });
}

// Initialize with templates from files
loadTemplatesFromFiles();

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

  templates.set(req.params.id, updated);
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
app.post('/api/templates/:id/render', async (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const context = req.body;
  const errors = [];

  // Simple variable replacement for {{namespace.key}}
  let content = template.content.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, path) => {
    const [namespace, key] = path.split('.');
    const value = context[namespace]?.[key];
    if (value === undefined) {
      errors.push(`Missing variable: ${match}`);
      return match;
    }
    return String(value);
  });

  // Try to render AsciiDoc using asciidoctor.js if installed
  let htmlOutput;
  try {
    const Asciidoctor = await import('asciidoctor.js')
      .then((m) => m.default ? m.default() : m());
    const opts = { safe: 'safe', attributes: { 'showtitle': true } };
    htmlOutput = Asciidoctor.convert(content, opts);
  } catch (err) {
    // If asciidoctor.js is not available or conversion fails, fallback to preformatted HTML
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
          <div>${content.replace(/</g, '&lt;')}</div>
        </body>
      </html>
    `;
  }

  res.json({
    html: htmlOutput,
    pdfUrl: `http://localhost:8087/api/templates/${template.id}/pdf?context=${encodeURIComponent(JSON.stringify(context))}`,
    errors,
  });
});

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  console.log(`Templates Service Mock running on port ${PORT}`);
});

// Simple PDF endpoint for preview/download in tests
app.get('/api/templates/:id/pdf', async (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).send('Not found');

  let context = {};
  if (req.query.context) {
    try {
      context = JSON.parse(decodeURIComponent(req.query.context));
    } catch (e) {
      console.error('Failed to parse context:', e);
    }
  }

  // Replace variables in content
  let content = template.content.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, path) => {
    const [namespace, key] = path.split('.');
    const value = context[namespace]?.[key];
    return value !== undefined ? String(value) : match;
  });

  // Try to render AsciiDoc using asciidoctor.js
  let htmlOutput;
  try {
    const Asciidoctor = await import('asciidoctor.js')
      .then((m) => m.default ? m.default() : m());
    const opts = { safe: 'safe', attributes: { 'showtitle': true } };
    htmlOutput = Asciidoctor.convert(content, opts);
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
          <div>${content.replace(/</g, '&lt;')}</div>
        </body>
      </html>
    `;
  }

  // Try to use asciidoctor-pdf CLI if installed on the system
  try {
    const { spawnSync } = await import('node:child_process');
    const tmp = await import('node:os');
    const tmpdir = tmp.tmpdir();
    const pdfPath = path.join(tmpdir, `${template.key || 'document'}-${Date.now()}.pdf`);
    const adocPath = path.join(tmpdir, `${template.key || 'document'}-${Date.now()}.adoc`);

    fs.writeFileSync(adocPath, content, 'utf8');

    const result = spawnSync('asciidoctor-pdf', ['-o', pdfPath, adocPath], { encoding: 'utf8' });
    if (result.status === 0 && fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      // clean up
      try { fs.unlinkSync(pdfPath); } catch (e) {}
      try { fs.unlinkSync(adocPath); } catch (e) {}

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.pdf"`);
      res.send(pdfBuffer);
      return;
    } else {
      console.warn('asciidoctor-pdf failed', result.stderr || result.stdout);
      try { fs.unlinkSync(adocPath); } catch (e) {}
    }
  } catch (err) {
    console.warn('asciidoctor-pdf not available or failed', err?.message || err);
  }

  // Fallback to returning HTML
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${template.key || 'document'}.html"`);
  res.send(htmlOutput);
  return;
});
