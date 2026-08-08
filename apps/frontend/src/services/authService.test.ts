import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable mock state for the auth store
const mockState: any = {
  user: { id: 'user-1' },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  currentCompanyId: null,
  currentCompanyName: null,
  isGlobalSuperAdmin: false,
  setAuth: vi.fn(),
  setCompanyAssignments: vi.fn(),
  setCurrentCompany: vi.fn(),
};

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockState,
  },
}));

// Mock the Apollo client
const mockClient = {
  query: vi.fn(),
  mutate: vi.fn(),
  clearStore: vi.fn(),
};
vi.mock('../lib/apollo', () => ({
  getApolloClient: () => mockClient,
}));

import { authService } from './authService';

describe('AuthService.restoreCompanyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mutable mock state
    mockState.user = { id: 'user-1' };
    mockState.currentCompanyId = null;
    mockState.currentCompanyName = null;
    mockState.isGlobalSuperAdmin = false;
    mockState.setAuth = vi.fn();
    mockState.setCompanyAssignments = vi.fn();
    mockState.setCurrentCompany = vi.fn();
  });

  it('returns null when there is no user', async () => {
    mockState.user = null;

    const result = await authService.restoreCompanyContext();

    expect(result).toBeNull();
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('keeps the current company when it is still valid', async () => {
    mockState.currentCompanyId = 'valid-company';
    mockClient.query.mockResolvedValue({
      data: { assignmentsByUser: [{ companyId: 'valid-company', companyName: 'MediVita' }] },
    });

    const result = await authService.restoreCompanyContext();

    expect(result).toBe('valid-company');
    expect(mockClient.mutate).not.toHaveBeenCalled();
    expect(mockState.setCurrentCompany).not.toHaveBeenCalled();
  });

  it('auto-switches to the single assignment when the stored company is stale', async () => {
    mockState.currentCompanyId = 'stale-company';
    mockClient.query.mockResolvedValue({
      data: {
        assignmentsByUser: [{ id: 'x', companyId: 'valid-company', companyName: 'MediVita', role: 'ADMIN' }],
      },
    });
    mockClient.mutate.mockResolvedValue({
      data: {
        switchCompany: {
          accessToken: 'new-token',
          user: { id: 'user-1' },
          authorization: { companyId: 'valid-company', companyName: 'MediVita' },
        },
      },
    });

    const result = await authService.restoreCompanyContext();

    expect(result).toBe('valid-company');
    expect(mockClient.mutate).toHaveBeenCalled();
    expect(mockState.setCompanyAssignments).toHaveBeenCalled();
  });

  it('auto-switches for a global super admin even with multiple assignments', async () => {
    mockState.isGlobalSuperAdmin = true;
    mockState.currentCompanyId = 'stale-company';
    mockClient.query.mockResolvedValue({
      data: {
        assignmentsByUser: [
          { companyId: 'c1', companyName: 'One' },
          { companyId: 'c2', companyName: 'Two' },
        ],
      },
    });
    mockClient.mutate.mockResolvedValue({
      data: {
        switchCompany: {
          accessToken: 'new-token',
          user: { id: 'user-1' },
          authorization: { companyId: 'c1', companyName: 'One' },
        },
      },
    });

    const result = await authService.restoreCompanyContext();

    expect(result).toBe('c1');
    expect(mockClient.mutate).toHaveBeenCalled();
  });

  it('clears the stale company for a regular user with multiple assignments', async () => {
    mockState.currentCompanyId = 'stale-company';
    mockClient.query.mockResolvedValue({
      data: {
        assignmentsByUser: [
          { companyId: 'c1', companyName: 'One' },
          { companyId: 'c2', companyName: 'Two' },
        ],
      },
    });

    const result = await authService.restoreCompanyContext();

    expect(result).toBeNull();
    expect(mockClient.mutate).not.toHaveBeenCalled();
    expect(mockState.setCurrentCompany).toHaveBeenCalledWith(null);
  });

  it('clears the company selection when switching fails', async () => {
    mockState.currentCompanyId = 'stale-company';
    mockClient.query.mockResolvedValue({
      data: { assignmentsByUser: [{ companyId: 'c1', companyName: 'One' }] },
    });
    mockClient.mutate.mockRejectedValue(new Error('switch failed'));

    const result = await authService.restoreCompanyContext();

    expect(result).toBeNull();
    expect(mockState.setCurrentCompany).toHaveBeenCalledWith(null);
  });
});
