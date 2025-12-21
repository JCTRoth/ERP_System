import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'user' | 'viewer';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentCompanyId: string | null;
  isAuthenticated: boolean;
  
  isAdmin: () => boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setCurrentCompany: (companyId: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentCompanyId: null,
      isAuthenticated: false,

      isAdmin: () => get().user?.role === 'admin',

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setCurrentCompany: (companyId) => {
        set({ currentCompanyId: companyId });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          currentCompanyId: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'erp-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentCompanyId: state.currentCompanyId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
