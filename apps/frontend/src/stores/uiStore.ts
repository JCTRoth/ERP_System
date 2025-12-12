import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  showTranslationKeys: boolean;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTranslationKeys: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      theme: 'system',
      showTranslationKeys: false,

      toggleSidebar: () => {
        set({ sidebarOpen: !get().sidebarOpen });
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTranslationKeys: () => {
        set({ showTranslationKeys: !get().showTranslationKeys });
      },
    }),
    {
      name: 'erp-ui',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
