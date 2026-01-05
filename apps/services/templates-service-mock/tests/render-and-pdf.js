import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
let puppeteer;
try {
  // try dynamic require for environments where puppeteer isn't installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  puppeteer = require('puppeteer');
} catch (e) {
  puppeteer = null;
}

async function run() {
  const TEMPLATE_ID = 'sample-invoice-1';
  const RENDER_URL = `http://localhost:8087/api/templates/${TEMPLATE_ID}/render`;

  // Sample context matching available variables
  const context = {
    order: {
      number: 'ORD-1000',
      date: new Date().toISOString(),
      status: 'confirmed',
      items: '2x Product A\n1x Product B',
      subtotal: 175,
      tax: 17.5,
      shipping: 10,
      total: 202.5,
    },
    company: {
      name: 'ACME Corp',
      address: '456 Business Ave',
      city: 'New York',
      postalCode: '10001',
      country: 'USA',
      email: 'info@acme.com',
      phone: '+1234567890',
    },
  };

  console.log('Requesting rendered HTML...');
  const res = await fetch(RENDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  if (!res.ok) {
    console.error('Render request failed', res.status, await res.text());
    process.exit(1);
  }

  const result = await res.json();
  const outDir = path.resolve(process.cwd(), 'tests-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // Write HTML
  const htmlPath = path.join(outDir, `${TEMPLATE_ID}.html`);
  console.log('Writing HTML to', htmlPath);
  fs.writeFileSync(htmlPath, result.html, 'utf8');

  if (puppeteer) {
    console.log('Launching headless browser to generate PDF...');
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(result.html, { waitUntil: 'networkidle0' });
    const pdfPath = path.join(outDir, `${TEMPLATE_ID}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();
    console.log('PDF written to', pdfPath);
  } else {
    console.log('Puppeteer not installed; skipping PDF generation. To enable PDF generation install puppeteer in the mock service.');
  }
  console.log('Test completed successfully');
}

run().catch((err) => {
  console.error('Test failed', err);
  process.exit(1);
});
