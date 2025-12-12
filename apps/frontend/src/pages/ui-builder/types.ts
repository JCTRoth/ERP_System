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

export interface UIComponent {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  children: UIComponent[];
}

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  icon: string;
  category: 'basic' | 'form' | 'layout' | 'data';
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  // Basic
  { type: 'text', label: 'Text', icon: '📝', category: 'basic' },
  { type: 'heading', label: 'Heading', icon: '🔤', category: 'basic' },
  { type: 'button', label: 'Button', icon: '🔘', category: 'basic' },
  { type: 'image', label: 'Image', icon: '🖼️', category: 'basic' },
  
  // Form
  { type: 'input', label: 'Input', icon: '✏️', category: 'form' },
  { type: 'select', label: 'Select', icon: '📋', category: 'form' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑️', category: 'form' },
  
  // Layout
  { type: 'card', label: 'Card', icon: '🗂️', category: 'layout' },
  { type: 'divider', label: 'Divider', icon: '➖', category: 'layout' },
  { type: 'spacer', label: 'Spacer', icon: '⬜', category: 'layout' },
  
  // Data
  { type: 'table', label: 'Table', icon: '📊', category: 'data' },
];
