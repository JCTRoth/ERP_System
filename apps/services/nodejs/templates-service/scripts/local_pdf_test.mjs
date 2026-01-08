import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const templatesDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'templates');
const invoicePath = path.join(templatesDir, 'invoice.adoc');
if (!fs.existsSync(invoicePath)) {
  console.error('Template not found at', invoicePath);
  process.exit(1);
}
let src = fs.readFileSync(invoicePath, 'utf8');

function normalizeTemplateToMustache(src) {
  const outParts = [];
  const stack = [];
  let i = 0;
  while (i < src.length) {
    const endMatch = src.slice(i).match(/^\{#end\}/);
    const openMatch = src.slice(i).match(/^\{#([a-zA-Z0-9_.]+)\}/);
    const varMatch = src.slice(i).match(/^\{([a-zA-Z_][a-zA-Z0-9_.\-]*)\}/);
    if (endMatch) {
      const last = stack.pop();
      if (last) outParts.push(`{{/${last}}}`);
      else outParts.push('{#end}');
      i += endMatch[0].length;
      continue;
    }
    if (openMatch) {
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
    outParts.push(src[i]);
    i += 1;
  }
  while (stack.length) {
    const name = stack.pop();
    outParts.push(`{{/${name}}}`);
  }
  return outParts.join('');
}

const normalized = normalizeTemplateToMustache(src);
fs.writeFileSync('/tmp/normalized.adoc', normalized, 'utf8');
console.log('WROTE /tmp/normalized.adoc');

// Use asciidoctor-pdf CLI if available
const adocPath = '/tmp/normalized.adoc';
const pdfPath = '/tmp/normalized.pdf';
const res = spawnSync('asciidoctor-pdf', ['-o', pdfPath, adocPath], { encoding: 'utf8' });
if (res.status === 0) {
  console.log('WROTE', pdfPath);
} else {
  console.error('asciidoctor-pdf failed:', res.stderr || res.stdout);
}
