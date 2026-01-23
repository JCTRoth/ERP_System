import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIComponent, UIRow } from '../pages/ui-builder/types';

export interface UIPage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  components: UIComponent[]; // Legacy flat list (for backward compatibility)
  rows?: UIRow[]; // New row-based structure
  scripts?: Record<string, string>; // Component ID -> script mapping
  createdAt: string;
  updatedAt: string;
}

interface UIBuilderState {
  pages: UIPage[];
  currentPageId: string | null;
  setPages: (pages: UIPage[]) => void;
  addPage: (page: Omit<UIPage, 'id' | 'createdAt' | 'updatedAt'>) => UIPage;
  updatePage: (id: string, updates: Partial<UIPage>) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => UIPage | null;
  setCurrentPage: (id: string | null) => void;
  getCurrentPage: () => UIPage | null;
  exportPage: (id: string) => string;
  importPage: (json: string) => UIPage | null;
  markDirty: (id: string, dirty: boolean) => void;
}

export const useUIBuilderStore = create<UIBuilderState>()(
  persist(
    (set, get) => ({
      pages: [],
      currentPageId: null,

      addPage: (pageData) => {
        const id = `page-${Date.now()}`;
        const now = new Date().toISOString();
        const newPage: UIPage = {
          ...pageData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          pages: [...state.pages, newPage],
          currentPageId: id,
        }));
        return newPage;
      },

      updatePage: (id, updates) => {
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === id
              ? { ...page, ...updates, updatedAt: new Date().toISOString() }
              : page
          ),
        }));
      },

      deletePage: (id) => {
        set((state) => ({
          pages: state.pages.filter((page) => page.id !== id),
          currentPageId: state.currentPageId === id ? null : state.currentPageId,
        }));
      },

      duplicatePage: (id) => {
        const state = get();
        const page = state.pages.find((p) => p.id === id);
        if (!page) return null;

        const newId = `page-${Date.now()}`;
        const now = new Date().toISOString();
        const newPage: UIPage = {
          ...page,
          id: newId,
          name: `${page.name} (Copy)`,
          slug: `${page.slug}-copy`,
          createdAt: now,
          updatedAt: now,
          components: JSON.parse(JSON.stringify(page.components)), // Deep clone
        };

        set((state) => ({
          pages: [...state.pages, newPage],
          currentPageId: newId,
        }));
        return newPage;
      },

      setPages: (pages) => {
        set({ pages });
      },

      markDirty: (_id, _dirty) => {
        // noop: persistence/dirty tracking happens elsewhere in the UI builder
      },

      setCurrentPage: (id) => {
        set({ currentPageId: id });
      },

      getCurrentPage: () => {
        const state = get();
        return state.pages.find((p) => p.id === state.currentPageId) || null;
      },

      exportPage: (id) => {
        const page = get().pages.find((p) => p.id === id);
        if (!page) return '';
        return JSON.stringify(page, null, 2);
      },

      importPage: (json) => {
        try {
          const pageData = JSON.parse(json);
          if (!pageData.name || !pageData.slug || !Array.isArray(pageData.components)) {
            throw new Error('Invalid page format');
          }
          return get().addPage({
            name: pageData.name,
            slug: pageData.slug,
            description: pageData.description,
            components: pageData.components,
          });
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'ui-builder-storage',
    }
  )
);
