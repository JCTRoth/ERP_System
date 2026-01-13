export type ComponentType =
  | 'text'
  | 'heading'
  | 'button'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'card'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'table';

export type ColumnSpan = 1 | 2 | 3;

export interface UIComponent {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  children: UIComponent[];
  styling?: ComponentStyling;
  columnSpan?: ColumnSpan;
  startColumn?: 1 | 2 | 3; // Column position where component starts (1-3)
  script?: string; // Client-side script for buttons
}

export interface UIRow {
  id: string;
  components: UIComponent[];
}

export interface ComponentStyling {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  borderRadius?: string;
  fontSize?: string;
  fontWeight?: string;
  textColor?: string;
  width?: string;
  height?: string;
  display?: string;
  gap?: string;
}

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  icon: string;
  category: 'basic' | 'form' | 'layout' | 'data';
  minColumns: ColumnSpan;
  maxColumns: ColumnSpan;
}

// Column size constraints per element type
// 1 column only: Buttons, Checkboxes
// 1-3 columns: Images, Input, Select
// 2-3 columns: Text, Card
// 3 columns only: Heading, Spacer, Divider, Table
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  // Basic
  { type: 'text', label: 'Text', icon: '📝', category: 'basic', minColumns: 2, maxColumns: 3 },
  { type: 'heading', label: 'Heading', icon: '🔤', category: 'basic', minColumns: 3, maxColumns: 3 },
  { type: 'button', label: 'Button', icon: '🔘', category: 'basic', minColumns: 1, maxColumns: 1 },
  { type: 'image', label: 'Image', icon: '🖼️', category: 'basic', minColumns: 1, maxColumns: 3 },
  
  // Form
  { type: 'input', label: 'Input', icon: '✏️', category: 'form', minColumns: 1, maxColumns: 3 },
  { type: 'select', label: 'Select', icon: '📋', category: 'form', minColumns: 1, maxColumns: 3 },
  { type: 'checkbox', label: 'Checkbox', icon: '☑️', category: 'form', minColumns: 1, maxColumns: 1 },
  
  // Layout
  { type: 'card', label: 'Card', icon: '🗂️', category: 'layout', minColumns: 2, maxColumns: 3 },
  { type: 'divider', label: 'Divider', icon: '➖', category: 'layout', minColumns: 3, maxColumns: 3 },
  { type: 'spacer', label: 'Spacer', icon: '⬜', category: 'layout', minColumns: 3, maxColumns: 3 },
  
  // Data
  { type: 'table', label: 'Table', icon: '📊', category: 'data', minColumns: 3, maxColumns: 3 },
];

export function getComponentDefinition(type: ComponentType): ComponentDefinition | undefined {
  return COMPONENT_DEFINITIONS.find(def => def.type === type);
}

export function getDefaultColumnSpan(type: ComponentType): ColumnSpan {
  const def = getComponentDefinition(type);
  return def?.minColumns ?? 1;
}

/**
 * Get valid starting column positions for a component with given span
 * E.g., span 2 can start at column 1 or 2; span 3 can only start at column 1
 */
export function getValidStartColumns(span: ColumnSpan): (1 | 2 | 3)[] {
  const validColumns: (1 | 2 | 3)[] = [];
  for (let col = 1; col <= 3; col++) {
    if (col + span - 1 <= 3) {
      validColumns.push(col as 1 | 2 | 3);
    }
  }
  return validColumns;
}

/**
 * Check if a component at a given start column with given span would overlap with other components
 */
export function hasOverlap(row: UIRow, startColumn: number, span: number, excludeId?: string): boolean {
  const endColumn = startColumn + span - 1;
  
  for (const comp of row.components) {
    if (excludeId && comp.id === excludeId) continue;
    
    const compStart = comp.startColumn ?? 1;
    const compSpan = comp.columnSpan || getDefaultColumnSpan(comp.type);
    const compEnd = compStart + compSpan - 1;
    
    // Check if ranges overlap
    if (!(endColumn < compStart || startColumn > compEnd)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get available start column positions for a component in a row
 */
export function getAvailableStartColumns(row: UIRow, component: UIComponent): (1 | 2 | 3)[] {
  const span = component.columnSpan || getDefaultColumnSpan(component.type);
  const validColumns = getValidStartColumns(span);
  
  return validColumns.filter(col => !hasOverlap(row, col, span, component.id));
}

export function getUsedColumnsInRow(row: UIRow): number {
  return row.components.reduce((sum, comp) => sum + (comp.columnSpan || getDefaultColumnSpan(comp.type)), 0);
}

export function getRemainingColumnsInRow(row: UIRow): number {
  return 3 - getUsedColumnsInRow(row);
}

export function canAddToRow(row: UIRow, type: ComponentType): boolean {
  const def = getComponentDefinition(type);
  if (!def) return false;
  const remaining = getRemainingColumnsInRow(row);
  return remaining >= def.minColumns;
}

export function getAvailableColumnSpans(row: UIRow, component: UIComponent): ColumnSpan[] {
  const def = getComponentDefinition(component.type);
  if (!def) return [1];
  
  const otherComponentsSize = row.components
    .filter(c => c.id !== component.id)
    .reduce((sum, c) => sum + (c.columnSpan || getDefaultColumnSpan(c.type)), 0);
  
  const available = 3 - otherComponentsSize;
  const spans: ColumnSpan[] = [];
  
  for (let i = def.minColumns; i <= Math.min(def.maxColumns, available); i++) {
    spans.push(i as ColumnSpan);
  }
  
  return spans.length > 0 ? spans : [def.minColumns];
}
