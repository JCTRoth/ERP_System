/**
 * Monaco Editor Configuration
 * 
 * Registers custom language definitions and autocomplete providers
 * for the Template Editor (AsciiDoc + $t{} + {var} syntax) and
 * provides translation key completions.
 */
import type { Monaco } from '@monaco-editor/react';
import type { languages, editor } from 'monaco-editor';

// Custom language ID for templates
export const TEMPLATE_LANGUAGE_ID = 'asciidoc-template';

// Track whether we've already registered the language
let languageRegistered = false;

/**
 * Register the custom asciidoc-template language with Monaco.
 * Includes tokenizer rules for:
 *   - $t{key.name} — translation references (teal)
 *   - {var.path} and {{var.path}} — variable references (blue)
 *   - {#loop}...{#end} — loop blocks (purple)
 *   - AsciiDoc headings, bold, italic
 */
export function registerTemplateLanguage(monaco: Monaco) {
  if (languageRegistered) return;
  languageRegistered = true;

  monaco.languages.register({ id: TEMPLATE_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(TEMPLATE_LANGUAGE_ID, {
    tokenizer: {
      root: [
        // Translation references: $t{key.name}
        [/\$t\{[^}]*\}/, 'translation-ref'],

        // Loop blocks: {#name} and {#end}
        [/\{#[a-zA-Z0-9_.]+\}/, 'loop-keyword'],
        [/\{#end\}/, 'loop-keyword'],

        // Mustache-style variables: {{var.path}}
        [/\{\{[^}]+\}\}/, 'variable-ref'],

        // Simple variables: {var.path} (but not {#...} or $t{...})
        [/\{(?!#)(?!\$t)[a-zA-Z_][a-zA-Z0-9_.]*(?:\|\|[^}]*)?\}/, 'variable-ref'],

        // AsciiDoc headings: = Title, == Section, etc.
        [/^={1,6}\s.*$/, 'heading'],

        // AsciiDoc bold
        [/\*[^*]+\*/, 'bold'],

        // AsciiDoc italic
        [/_[^_]+_/, 'italic'],

        // AsciiDoc attributes :key: value
        [/^:[a-zA-Z-]+:.*$/, 'attribute'],

        // Comments
        [/^\/\/.*$/, 'comment'],

        // Table delimiters
        [/^\|===\s*$/, 'delimiter'],
        [/^\|/, 'delimiter'],
      ],
    },
  } as languages.IMonarchLanguage);

  // Define custom theme tokens
  monaco.editor.defineTheme('template-theme-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'translation-ref', foreground: '4EC9B0', fontStyle: 'bold' },  // teal
      { token: 'variable-ref', foreground: '569CD6', fontStyle: 'italic' },   // blue
      { token: 'loop-keyword', foreground: 'C586C0', fontStyle: 'bold' },     // purple
      { token: 'heading', foreground: 'DCDCAA', fontStyle: 'bold' },          // yellow
      { token: 'bold', foreground: 'D4D4D4', fontStyle: 'bold' },
      { token: 'italic', foreground: 'D4D4D4', fontStyle: 'italic' },
      { token: 'attribute', foreground: '9CDCFE' },                           // light blue
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },        // green
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {},
  });

  monaco.editor.defineTheme('template-theme-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'translation-ref', foreground: '008080', fontStyle: 'bold' },   // teal
      { token: 'variable-ref', foreground: '0000FF', fontStyle: 'italic' },    // blue
      { token: 'loop-keyword', foreground: 'AF00DB', fontStyle: 'bold' },      // purple
      { token: 'heading', foreground: '795E26', fontStyle: 'bold' },           // brown
      { token: 'bold', foreground: '000000', fontStyle: 'bold' },
      { token: 'italic', foreground: '000000', fontStyle: 'italic' },
      { token: 'attribute', foreground: '001080' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {},
  });
}

/**
 * Register a completion provider for $t{} translation keys.
 * @param translationKeys - Array of available translation key strings
 */
export function registerTranslationCompletions(
  monaco: Monaco,
  translationKeys: string[]
) {
  // Register for our custom template language
  monaco.languages.registerCompletionItemProvider(TEMPLATE_LANGUAGE_ID, {
    triggerCharacters: ['{', '.'],
    provideCompletionItems(model: editor.ITextModel, position: { lineNumber: number; column: number }) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Check if we're inside a $t{...} context
      const match = textUntilPosition.match(/\$t\{([^}]*)$/);
      if (!match) return { suggestions: [] };

      const prefix = match[1]; // what user has typed so far after $t{
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - prefix.length,
        endColumn: position.column,
      };

      const suggestions: languages.CompletionItem[] = translationKeys
        .filter((key) => key.startsWith(prefix) || key.includes(prefix))
        .slice(0, 50)
        .map((key) => ({
          label: key,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: key + '}',
          range,
          detail: 'Translation key',
          sortText: key.startsWith(prefix) ? '0' + key : '1' + key,
        }));

      return { suggestions };
    },
  });
}

/**
 * Default Monaco editor options for template editing.
 */
export const templateEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  lineNumbers: 'on',
  wordWrap: 'on',
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  suggest: {
    showKeywords: true,
    showSnippets: true,
  },
};

/**
 * Default Monaco editor options for script (JavaScript) editing.
 */
export const scriptEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  lineNumbers: 'on',
  wordWrap: 'off',
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
};
