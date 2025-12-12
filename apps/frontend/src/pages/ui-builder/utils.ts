import { UIComponent } from './types';

let counter = 0;

export function generateId(): string {
  return `component-${Date.now()}-${counter++}`;
}

export function generateReactCode(components: UIComponent[]): string {
  const imports = new Set<string>();
  imports.add("import React from 'react';");
  
  const componentCode = components.map((component) => generateComponentCode(component)).join('\n        ');
  
  return `${Array.from(imports).join('\n')}

export default function GeneratedPage() {
  return (
    <div className="p-6">
      <div className="space-y-4">
        ${componentCode}
      </div>
    </div>
  );
}
`;
}

function generateComponentCode(component: UIComponent): string {
  const { type, props, id } = component;
  
  switch (type) {
    case 'text':
      return `<p className="${props.variant === 'small' ? 'text-sm' : 'text-base'}" key="${id}">${escapeHtml(props.content as string)}</p>`;
      
    case 'heading':
      const level = (props.level as string) || 'h2';
      const headingClass = getHeadingClass(level);
      return `<${level} className="${headingClass}" key="${id}">${escapeHtml(props.content as string)}</${level}>`;
      
    case 'button':
      const variant = (props.variant as string) || 'primary';
      return `<button className="${getButtonClass(variant)}" key="${id}">${escapeHtml(props.label as string)}</button>`;
      
    case 'input':
      return `<div key="${id}">
          ${props.label ? `<label className="block text-sm font-medium mb-1">${escapeHtml(props.label as string)}</label>` : ''}
          <input type="${props.type || 'text'}" placeholder="${escapeHtml(props.placeholder as string || '')}" className="w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>`;
        
    case 'select':
      const options = (props.options as string[]) || [];
      return `<div key="${id}">
          ${props.label ? `<label className="block text-sm font-medium mb-1">${escapeHtml(props.label as string)}</label>` : ''}
          <select className="w-full rounded-md border border-gray-300 px-3 py-2">
            ${options.map((opt) => `<option>${escapeHtml(opt)}</option>`).join('\n            ')}
          </select>
        </div>`;
        
    case 'checkbox':
      return `<div className="flex items-center gap-2" key="${id}">
          <input type="checkbox" className="h-4 w-4" />
          <label className="text-sm">${escapeHtml(props.label as string)}</label>
        </div>`;
        
    case 'card':
      return `<div className="rounded-lg border border-gray-200 bg-white p-4 shadow" key="${id}">
          ${props.title ? `<h3 className="font-semibold">${escapeHtml(props.title as string)}</h3>` : ''}
          <div className="mt-2">Card content</div>
        </div>`;
        
    case 'divider':
      return `<hr className="border-gray-200" key="${id}" />`;
      
    case 'spacer':
      return `<div style={{ height: ${props.height || 24} }} key="${id}" />`;
      
    case 'image':
      return props.src 
        ? `<img src="${escapeHtml(props.src as string)}" alt="${escapeHtml(props.alt as string || '')}" className="max-w-full h-auto" key="${id}" />`
        : `<div className="h-32 bg-gray-100 rounded-md flex items-center justify-center" key="${id}">Image placeholder</div>`;
        
    case 'table':
      const columns = (props.columns as string[]) || ['Column 1', 'Column 2'];
      return `<div className="overflow-x-auto" key="${id}">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                ${columns.map((col) => `<th className="px-4 py-2 text-left text-sm font-medium">${escapeHtml(col)}</th>`).join('\n                ')}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                ${columns.map(() => `<td className="px-4 py-2 text-sm">Sample data</td>`).join('\n                ')}
              </tr>
            </tbody>
          </table>
        </div>`;
        
    default:
      return `{/* Unknown component: ${type} */}`;
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getHeadingClass(level: string): string {
  const classes: Record<string, string> = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
    h5: 'text-base font-medium',
    h6: 'text-sm font-medium',
  };
  return classes[level] || classes.h2;
}

function getButtonClass(variant: string): string {
  const classes: Record<string, string> = {
    primary: 'bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300',
    outline: 'border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50',
    danger: 'bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700',
  };
  return classes[variant] || classes.primary;
}

export function generateJsonSchema(components: UIComponent[]): string {
  return JSON.stringify(components, null, 2);
}
