import { gql } from '@apollo/client';
import { getApolloClient } from '../lib/apollo';
import { useAuthStore, CompanyAssignment, AuthorizationContext } from '../stores/authStore';
import { normalizeUuid } from '../utils/uuid';

// GraphQL Mutations
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        firstName
        lastName
        preferredLanguage
        role
      }
      accessToken
      refreshToken
      expiresAt
    }
  }
`;

const GET_USER_ASSIGNMENTS = gql`
  query GetUserAssignments($userId: ID!) {
    assignmentsByUser(userId: $userId) {
      id
      companyId
      companyName
      role
    }
  }
`;

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!, $companyId: UUID) {
    refreshToken(refreshToken: $refreshToken, companyId: $companyId) {
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        firstName
        lastName
        preferredLanguage
        role
      }
      authorization {
        userId
        companyId
        companyName
        membershipValid
        companyRole
        isGlobalSuperAdmin
        groupCodes
        permissionCodes
        scopeGrants {
          permissionCode
          scopeType
          scopeJson
        }
      }
    }
  }
`;

const SWITCH_COMPANY_MUTATION = gql`
  mutation SwitchCompany($companyId: UUID!) {
    switchCompany(companyId: $companyId) {
      accessToken
      expiresAt
      user {
        id
        email
        firstName
        lastName
        preferredLanguage
        role
      }
      authorization {
        userId
        companyId
        companyName
        membershipValid
        companyRole
        isGlobalSuperAdmin
        groupCodes
        permissionCodes
        scopeGrants {
          permissionCode
          scopeType
          scopeJson
        }
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password)
  }
`;

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      firstName
      lastName
      preferredLanguage
      role
    }
  }
`;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferredLanguage: string;
    role?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

export type PasswordResetResult = boolean;

interface AuthContextResult {
  accessToken: string;
  expiresAt: string;
  user: LoginResult['user'];
  authorization: AuthorizationContext;
}

class AuthService {
  private refreshPromise: Promise<boolean> | null = null;

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: LOGIN_MUTATION,
      variables: credentials,
    });
    
    const result = data.login;
    
    // Store auth data
    useAuthStore.getState().setAuth(
      result.user,
      result.accessToken,
      result.refreshToken,
      null
    );

    // Fetch company assignments for the logged-in user
    try {
      const assignments = await this.fetchCompanyAssignments(result.user.id);
      useAuthStore.getState().setCompanyAssignments(assignments);
    } catch (err) {
      console.warn('Could not fetch company assignments:', err);
      useAuthStore.getState().setCompanyAssignments([]);
    }
    
    return result;
  }

  async fetchCompanyAssignments(userId: string): Promise<CompanyAssignment[]> {
    const client = getApolloClient();
    const normalizedUserId = normalizeUuid(userId);
    try {
      const { data } = await client.query({
        query: GET_USER_ASSIGNMENTS,
        variables: { userId: normalizedUserId },
        fetchPolicy: 'network-only',
      });
      return data.assignmentsByUser || [];
    } catch (err) {
      console.warn('Failed to fetch company assignments:', err);
      return [];
    }
  }

  async logout(): Promise<void> {
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    
    try {
      if (refreshToken) {
        const client = getApolloClient();
        try {
          await client.mutate({
            mutation: LOGOUT_MUTATION,
            variables: { refreshToken },
          });
        } catch (mutationError: any) {
          // Logout mutation might not be available (e.g., not in gateway schema)
          // or token may be expired — this is non-critical, we clear local state anyway
          if (mutationError.graphQLErrors?.length > 0) {
            console.warn('Logout mutation failed (non-critical):', mutationError.graphQLErrors[0]?.message);
          } else {
            console.warn('Logout request failed (non-critical):', mutationError.message);
          }
        }
      }
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      state.logout();
      // Clear Apollo cache
      try {
        const client = getApolloClient();
        await client.clearStore();
      } catch {
        // Ignore cache clear errors
      }
    }
  }

  async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async doRefreshToken(): Promise<boolean> {
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    const currentCompanyId = state.currentCompanyId;

    if (!refreshToken) {
      return false;
    }

    try {
      const client = getApolloClient();
      const { data } = await client.mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken, companyId: currentCompanyId || null },
      });

      if (!data?.refreshToken) {
        console.warn('RefreshToken returned empty response, keeping existing auth state');
        return false;
      }

      const result = data.refreshToken;
      useAuthStore.getState().setAuth(
        result.user ?? state.user!,
        result.accessToken,
        result.refreshToken,
        result.authorization ?? null
      );

      return true;
    } catch (error: any) {
      // Refresh token failure is non-critical — the user may still have a valid session
      // Don't logout on failure, just log the warning and keep existing state
      if (error.graphQLErrors?.length > 0) {
        console.warn('RefreshToken mutation not available (non-critical):', error.graphQLErrors[0]?.message);
      } else {
        console.warn('RefreshToken failed (non-critical):', error.message);
      }
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: REQUEST_PASSWORD_RESET_MUTATION,
      variables: { email },
    });
    // Backend returns a boolean indicating success
    return Boolean(data.requestPasswordReset);
  }

  async resetPassword(token: string, password: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: RESET_PASSWORD_MUTATION,
      variables: { token, password },
    });
    // Backend returns a boolean
    return Boolean(data.resetPassword);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: CHANGE_PASSWORD_MUTATION,
      variables: { currentPassword, newPassword },
    });
    // Backend returns a boolean
    return Boolean(data.changePassword);
  }

  async getCurrentUser() {
    const client = getApolloClient();
    const { data } = await client.query({
      query: GET_CURRENT_USER,
      fetchPolicy: 'network-only',
    });
    return data.me;
  }

  async switchCompany(companyId: string): Promise<AuthContextResult> {
    const client = getApolloClient();
    const state = useAuthStore.getState();
    const normalizedCompanyId = normalizeUuid(companyId);

    const { data } = await client.mutate({
      mutation: SWITCH_COMPANY_MUTATION,
      variables: { companyId: normalizedCompanyId },
    });

    const result = data.switchCompany;
    useAuthStore.getState().setAuth(
      result.user,
      result.accessToken,
      state.refreshToken || '',
      result.authorization
    );
    await client.clearStore();
    return result;
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  hasPermission(permission: string): boolean {
    return useAuthStore.getState().hasPermission(permission);
  }

  hasRole(role: string): boolean {
    const state = useAuthStore.getState();
    return state.companyRole === role || state.user?.role === role;
  }
}

export const authService = new AuthService();
