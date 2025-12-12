import { describe, it, expect } from 'vitest';
import { generateReactCode, generateJsonSchema, generateId } from '../pages/ui-builder/utils';
import { UIComponent } from '../pages/ui-builder/types';

describe('UI Builder Utils', () => {
  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^component-\d+-\d+$/);
    });
  });

  describe('generateReactCode', () => {
    it('generates code for empty components array', () => {
      const code = generateReactCode([]);
      
      expect(code).toContain("import React from 'react'");
      expect(code).toContain('export default function GeneratedPage()');
      expect(code).toContain('<div className="p-6">');
    });

    it('generates code for text component', () => {
      const components: UIComponent[] = [
        {
          id: 'test-1',
          type: 'text',
          props: { content: 'Hello World', variant: 'body' },
          children: [],
        },
      ];
      
      const code = generateReactCode(components);
      
      expect(code).toContain('Hello World');
      expect(code).toContain('<p className="text-base"');
    });

    it('generates code for heading component', () => {
      const components: UIComponent[] = [
        {
          id: 'test-2',
          type: 'heading',
          props: { content: 'My Heading', level: 'h1' },
          children: [],
        },
      ];
      
      const code = generateReactCode(components);
      
      expect(code).toContain('<h1');
      expect(code).toContain('My Heading');
      expect(code).toContain('text-3xl font-bold');
    });

    it('generates code for button component', () => {
      const components: UIComponent[] = [
        {
          id: 'test-3',
          type: 'button',
          props: { label: 'Click Me', variant: 'primary' },
          children: [],
        },
      ];
      
      const code = generateReactCode(components);
      
      expect(code).toContain('<button');
      expect(code).toContain('Click Me');
      expect(code).toContain('bg-blue-600');
    });

    it('generates code for input component with label', () => {
      const components: UIComponent[] = [
        {
          id: 'test-4',
          type: 'input',
          props: { label: 'Email', placeholder: 'Enter email', type: 'email' },
          children: [],
        },
      ];
      
      const code = generateReactCode(components);
      
      expect(code).toContain('<input');
      expect(code).toContain('type="email"');
      expect(code).toContain('placeholder="Enter email"');
      expect(code).toContain('<label');
      expect(code).toContain('Email');
    });
  });

  describe('generateJsonSchema', () => {
    it('generates valid JSON', () => {
      const components: UIComponent[] = [
        {
          id: 'test-1',
          type: 'text',
          props: { content: 'Test' },
          children: [],
        },
      ];
      
      const json = generateJsonSchema(components);
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('text');
    });

    it('preserves component structure', () => {
      const components: UIComponent[] = [
        {
          id: 'test-1',
          type: 'card',
          props: { title: 'Card Title' },
          children: [
            {
              id: 'test-2',
              type: 'text',
              props: { content: 'Card content' },
              children: [],
            },
          ],
        },
      ];
      
      const json = generateJsonSchema(components);
      const parsed = JSON.parse(json);
      
      expect(parsed[0].children).toHaveLength(1);
      expect(parsed[0].children[0].type).toBe('text');
    });
  });
});
