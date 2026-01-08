import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      if (last) {
        outParts.push(`{{/${last}}}`);
      } else {
        outParts.push('{#end}');
      }
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

    if (endMatch) {
      const last = stack.pop();
      if (last) {
        outParts.push(`{{/${last}}}`);
      } else {
        outParts.push('{#end}');
      }
      i += endMatch[0].length;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tplPath = path.join(__dirname, '..', 'templates', 'invoice.adoc');
const src = fs.readFileSync(tplPath, 'utf8');
const normalized = normalizeTemplateToMustache(src);
console.log('---- Normalized preview (first 800 chars) ----\n');
console.log(normalized.slice(0,800));
console.log('\n---- End preview ----\n');

// Count occurrences
const openTags = (normalized.match(/\{\{#([a-zA-Z0-9_.]+)\}\}/g) || []).length;
const closeTags = (normalized.match(/\{\{\/([a-zA-Z0-9_.]+)\}\}/g) || []).length;
console.log('Open tags:', openTags, 'Close tags:', closeTags);

const openNames = (normalized.match(/\{\{#([a-zA-Z0-9_.]+)\}\}/g) || []).map(m=>m.replace(/\{\{|\}\}/g,''));
const closeNames = (normalized.match(/\{\{\/([a-zA-Z0-9_.]+)\}\}/g) || []).map(m=>m.replace(/\{\{|\}\}/g,''));
console.log('Open names sample:', openNames.slice(0,10));
console.log('Close names sample:', closeNames.slice(0,10));

// Print lines around where 'items' occurs
const idx = normalized.indexOf('{{#items}}');
if (idx !== -1) {
  const start = Math.max(0, idx-80);
  const end = Math.min(normalized.length, idx+300);
  console.log('\n--- Context around {{#items}} ---\n');
  console.log(normalized.slice(start,end));
}

// Find any literal {#end} left
const literalEnds = (normalized.match(/\{#end\}/g) || []).length;
console.log('\nLiteral {#end} occurrences:', literalEnds);

// Find malformed tokens like {{{/end}}}
const bad = (normalized.match(/\{\{\{\/end\}\}\}|\{\{\/end\}\}|\{\/end\}|\{\{#end\}\}/g) || []);
console.log('Possible malformed tokens found:', bad.length, bad.slice(0,10));
