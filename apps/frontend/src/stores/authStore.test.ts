import { describe, it, expect } from 'vitest';
import { useAuthStore } from '../stores/authStore';

describe('authStore', () => {
  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('setAuth updates state correctly', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
  });

  it('setCurrentCompany updates company ID', () => {
    useAuthStore.getState().setCurrentCompany('company-123');
    
    expect(useAuthStore.getState().currentCompanyId).toBe('company-123');
  });

  it('updateUser updates user data', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    
    useAuthStore.getState().setAuth(mockUser, 'token', 'refresh');
    useAuthStore.getState().updateUser({ firstName: 'Updated' });
    
    expect(useAuthStore.getState().user?.firstName).toBe('Updated');
    expect(useAuthStore.getState().user?.lastName).toBe('User');
  });

  it('logout clears all auth state', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      preferredLanguage: 'en',
    };
    
    useAuthStore.getState().setAuth(mockUser, 'token', 'refresh');
    useAuthStore.getState().setCurrentCompany('company-123');
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.currentCompanyId).toBeNull();
  });
});
