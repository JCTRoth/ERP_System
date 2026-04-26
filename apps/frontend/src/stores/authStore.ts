import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'VIEWER';

export interface CompanyAssignment {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
}

export interface ScopeGrant {
  permissionCode: string;
  scopeType: string;
  scopeJson?: string | null;
}

export interface AuthorizationContext {
  userId: string;
  companyId: string;
  companyName: string;
  membershipValid: boolean;
  companyRole?: string | null;
  isGlobalSuperAdmin: boolean;
  groupCodes: string[];
  permissionCodes: string[];
  scopeGrants: ScopeGrant[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentCompanyId: string | null;
  currentCompanyName: string | null;
  companyRole: string | null;
  isGlobalSuperAdmin: boolean;
  groupCodes: string[];
  permissionCodes: string[];
  scopeGrants: ScopeGrant[];
  companyAssignments: CompanyAssignment[];
  isAuthenticated: boolean;
  
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  hasPermission: (permission: string) => boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, authorization?: AuthorizationContext | null) => void;
  setAuthorizationContext: (authorization: AuthorizationContext | null, accessToken?: string | null) => void;
  setCompanyAssignments: (assignments: CompanyAssignment[]) => void;
  setCurrentCompany: (companyId: string | null) => void;
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
      currentCompanyName: null,
      companyRole: null,
      isGlobalSuperAdmin: false,
      groupCodes: [],
      permissionCodes: [],
      scopeGrants: [],
      companyAssignments: [],
      isAuthenticated: false,

      isAdmin: () =>
        get().isGlobalSuperAdmin || ['SUPER_ADMIN', 'ADMIN'].includes(get().companyRole || ''),

      isSuperAdmin: () =>
        get().isGlobalSuperAdmin || get().companyRole === 'SUPER_ADMIN',

      hasPermission: (permission) => {
        if (get().isGlobalSuperAdmin) {
          return true;
        }

        return get().permissionCodes.includes(permission);
      },

      setAuth: (user, accessToken, refreshToken, authorization = null) => {
        set({
          user,
          accessToken,
          refreshToken,
          currentCompanyId: authorization?.companyId ?? null,
          currentCompanyName: authorization?.companyName ?? null,
          companyRole: authorization?.companyRole ?? null,
          isGlobalSuperAdmin: authorization?.isGlobalSuperAdmin ?? user.role === 'SUPER_ADMIN',
          groupCodes: authorization?.groupCodes ?? [],
          permissionCodes: authorization?.permissionCodes ?? [],
          scopeGrants: authorization?.scopeGrants ?? [],
          isAuthenticated: true,
        });
      },

      setAuthorizationContext: (authorization, accessToken = null) => {
        set((state) => ({
          accessToken: accessToken ?? state.accessToken,
          currentCompanyId: authorization?.companyId ?? null,
          currentCompanyName: authorization?.companyName ?? null,
          companyRole: authorization?.companyRole ?? null,
          isGlobalSuperAdmin: authorization?.isGlobalSuperAdmin ?? state.user?.role === 'SUPER_ADMIN',
          groupCodes: authorization?.groupCodes ?? [],
          permissionCodes: authorization?.permissionCodes ?? [],
          scopeGrants: authorization?.scopeGrants ?? [],
        }));
      },

      setCompanyAssignments: (assignments) => {
        set({ companyAssignments: assignments });
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
          currentCompanyName: null,
          companyRole: null,
          isGlobalSuperAdmin: false,
          groupCodes: [],
          permissionCodes: [],
          scopeGrants: [],
          companyAssignments: [],
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
        currentCompanyName: state.currentCompanyName,
        companyRole: state.companyRole,
        isGlobalSuperAdmin: state.isGlobalSuperAdmin,
        groupCodes: state.groupCodes,
        permissionCodes: state.permissionCodes,
        scopeGrants: state.scopeGrants,
        companyAssignments: state.companyAssignments,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
