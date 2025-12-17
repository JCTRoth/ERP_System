import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '../stores/authStore';

const httpLink = createHttpLink({
  uri: '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().accessToken;
  const companyId = useAuthStore.getState().currentCompanyId;
  const language = localStorage.getItem('erp-language') || 'en';

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-company-id': companyId || '',
      'accept-language': language,
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  let shouldForceLogout = false;

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      if (message.includes('translations') || message.includes('customers') || message.includes('Unknown type')) {
        return;
      }

      const code = extensions?.code;
      if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
        shouldForceLogout = true;
        return;
      }

      console.error(`[GraphQL error]: ${operation.operationName}: ${message}`);
    });
  }

  if (networkError) {
    if ('statusCode' in networkError) {
      const statusCode = networkError.statusCode;
      if (statusCode === 401 || statusCode === 403) {
        shouldForceLogout = true;
      } else if (statusCode !== 400) {
        console.error(`[Network error]: ${networkError}`);
      }
    } else {
      console.error(`[Network error]: ${networkError}`);
    }
  }

  if (shouldForceLogout) {
    const logout = useAuthStore.getState().logout;
    logout();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          companies: {
            merge: false,
          },
          users: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// Export a getter function for the Apollo client
export const getApolloClient = () => apolloClient;
