/**
 * Central keyboard shortcuts registry for the ERP System.
 * This module defines all available shortcuts and categorizes them.
 */

export interface KeyboardShortcut {
  /** Unique key identifier */
  id: string;
  /** Key combination display string (e.g., "Ctrl+K") */
  keys: string;
  /** i18n key for the action description */
  i18nKey: string;
  /** Fallback English description */
  description: string;
  /** Category for grouping in help overlay */
  category: 'global' | 'navigation' | 'actions' | 'modal';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global shortcuts
  {
    id: 'show-help',
    keys: '?',
    i18nKey: 'shortcuts.showHelp',
    description: 'Show keyboard shortcuts',
    category: 'global',
  },
  {
    id: 'close-modal',
    keys: 'Escape',
    i18nKey: 'shortcuts.closeModal',
    description: 'Close dialog / clear focus',
    category: 'global',
  },
  {
    id: 'focus-search',
    keys: '/',
    i18nKey: 'shortcuts.focusSearch',
    description: 'Focus search field',
    category: 'global',
  },
  {
    id: 'go-settings',
    keys: 'Ctrl+,',
    i18nKey: 'shortcuts.goSettings',
    description: 'Go to Settings',
    category: 'global',
  },

  // Navigation shortcuts
  {
    id: 'nav-dashboard',
    keys: 'Alt+H',
    i18nKey: 'shortcuts.navDashboard',
    description: 'Go to Dashboard',
    category: 'navigation',
  },
  {
    id: 'nav-products',
    keys: 'Alt+P',
    i18nKey: 'shortcuts.navProducts',
    description: 'Go to Products',
    category: 'navigation',
  },
  {
    id: 'nav-orders',
    keys: 'Alt+O',
    i18nKey: 'shortcuts.navOrders',
    description: 'Go to Orders',
    category: 'navigation',
  },
  {
    id: 'nav-accounting',
    keys: 'Alt+A',
    i18nKey: 'shortcuts.navAccounting',
    description: 'Go to Accounting',
    category: 'navigation',
  },
  {
    id: 'nav-masterdata',
    keys: 'Alt+M',
    i18nKey: 'shortcuts.navMasterdata',
    description: 'Go to Master Data',
    category: 'navigation',
  },
  {
    id: 'nav-templates',
    keys: 'Alt+T',
    i18nKey: 'shortcuts.navTemplates',
    description: 'Go to Templates',
    category: 'navigation',
  },
  {
    id: 'nav-users',
    keys: 'Alt+U',
    i18nKey: 'shortcuts.navUsers',
    description: 'Go to Users',
    category: 'navigation',
  },
  {
    id: 'nav-companies',
    keys: 'Alt+C',
    i18nKey: 'shortcuts.navCompanies',
    description: 'Go to Companies',
    category: 'navigation',
  },

  // Action shortcuts
  {
    id: 'create-new',
    keys: 'N',
    i18nKey: 'shortcuts.createNew',
    description: 'Create new item',
    category: 'actions',
  },
  {
    id: 'refresh',
    keys: 'R',
    i18nKey: 'shortcuts.refresh',
    description: 'Refresh current data',
    category: 'actions',
  },

  // Modal shortcuts
  {
    id: 'save-form',
    keys: 'Ctrl+Enter',
    i18nKey: 'shortcuts.saveForm',
    description: 'Save / submit form',
    category: 'modal',
  },
];

export const SHORTCUT_CATEGORIES = [
  { id: 'global', i18nKey: 'shortcuts.category.global', label: 'Global' },
  { id: 'navigation', i18nKey: 'shortcuts.category.navigation', label: 'Navigation' },
  { id: 'actions', i18nKey: 'shortcuts.category.actions', label: 'Page Actions' },
  { id: 'modal', i18nKey: 'shortcuts.category.modal', label: 'Dialogs & Forms' },
] as const;
