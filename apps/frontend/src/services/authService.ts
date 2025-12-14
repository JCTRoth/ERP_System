import { gql } from '@apollo/client';
import { getApolloClient } from '../lib/apollo';
import { useAuthStore } from '../stores/authStore';

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
      }
      accessToken
      refreshToken
    }
  }
`;

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
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
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      success
      message
    }
  }
`;

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
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
      permissions
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
    permissions?: string[];
  };
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
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
      result.refreshToken
    );
    
    return result;
  }

  async logout(): Promise<void> {
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    
    try {
      if (refreshToken) {
        const client = getApolloClient();
        await client.mutate({
          mutation: LOGOUT_MUTATION,
          variables: { refreshToken },
        });
      }
    } catch (error) {
      // Ignore logout errors - we'll clear local state anyway
      console.warn('Logout error:', error);
    } finally {
      state.logout();
      // Clear Apollo cache
      const client = getApolloClient();
      await client.clearStore();
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

    if (!refreshToken) {
      return false;
    }

    try {
      const client = getApolloClient();
      const { data } = await client.mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      });

      const result = data.refreshToken;
      
      // Update tokens
      useAuthStore.setState({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Token refresh failed - logout
      state.logout();
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: REQUEST_PASSWORD_RESET_MUTATION,
      variables: { email },
    });
    return data.requestPasswordReset;
  }

  async resetPassword(token: string, password: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: RESET_PASSWORD_MUTATION,
      variables: { token, password },
    });
    return data.resetPassword;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<PasswordResetResult> {
    const client = getApolloClient();
    const { data } = await client.mutate({
      mutation: CHANGE_PASSWORD_MUTATION,
      variables: { currentPassword, newPassword },
    });
    return data.changePassword;
  }

  async getCurrentUser() {
    const client = getApolloClient();
    const { data } = await client.query({
      query: GET_CURRENT_USER,
      fetchPolicy: 'network-only',
    });
    return data.me;
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  hasPermission(permission: string): boolean {
    const user = useAuthStore.getState().user;
    // @ts-ignore - permissions may not be on all users
    return user?.permissions?.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const user = useAuthStore.getState().user;
    // @ts-ignore - role may not be on all users
    return user?.role === role;
  }
}

export const authService = new AuthService();
