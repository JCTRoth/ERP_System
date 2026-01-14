import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from '@apollo/client';
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
      // Skip known non-critical errors (schema mismatches, unavailable services)
      if (message.includes('translations') || 
          message.includes('customers') || 
          message.includes('Unknown type') ||
          message.includes('Cannot query field') ||
          message.includes('Unknown argument') ||
          message.includes('GRAPHQL_VALIDATION_FAILED')) {
        return;
      }

      const code = extensions?.code;
      // Only force logout for explicit auth errors
      if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
        shouldForceLogout = true;
        return;
      }
    });
  }

  if (networkError) {
    if ('statusCode' in networkError) {
      const statusCode = networkError.statusCode;

      // Only force logout for explicit auth failures (401/403)
      if (statusCode === 401 || statusCode === 403) {
        shouldForceLogout = true;
      }
      // Do NOT force logout for 500 errors (server-side issues) — leave the
      // decision to the UI or specific handlers. This prevents accidental
      // logouts when subgraphs or downstream services are temporarily failing.
      // Silently ignore 400 validation errors (schema mismatches / missing federated subgraph)
      if (statusCode === 400) {
        return;
      }
      // Note: other non-auth errors will be logged below
    }
  }

  // Only log errors if not forcing logout (to avoid noisy auth errors)
  if (!shouldForceLogout) {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, extensions }) => {
        // Skip logging for known schema/service issues
        if (message.includes('Cannot query field') ||
            message.includes('Unknown argument') ||
            message.includes('Unknown type') ||
            extensions?.code === 'GRAPHQL_VALIDATION_FAILED') {
          return;
        }
        console.error(`[GraphQL error]: ${operation.operationName}: ${message}`);
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }
  }

  if (shouldForceLogout) {
    setTimeout(() => {
      const logout = useAuthStore.getState().logout;
      logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.assign('/auth/login');
      }
    }, 0);
  }
});

// Shop service client (separate endpoint due to type conflicts with masterdata-service)
// Always use relative path - Vite proxy handles dev, nginx handles production
const shopGraphqlUrl = '/shop/graphql';

const shopHttpLink = createHttpLink({
  uri: shopGraphqlUrl,
  credentials: 'same-origin',
});

// Create a console logging link for debugging
const logLink = new ApolloLink((operation, forward) => {
  console.log(`[Apollo] ${operation.operationName}:`, {
    query: operation.query.loc?.source.body,
    variables: operation.variables,
    context: operation.getContext(),
  });
  return forward(operation).map((response) => {
    console.log(`[Apollo] ${operation.operationName} response:`, response);
    return response;
  });
});

export const shopApolloClient = new ApolloClient({
  link: from([logLink, errorLink, authLink, shopHttpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          products: {
            merge: false,
          },
          shopOrders: {
            merge: false,
          },
        },
      },
    },
  }),
  // Disable all Apollo Client optimizations and caching
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  // Disable schema validation and introspection
  queryDeduplication: false,
  assumeImmutableResults: false,
  // Prevent Apollo DevTools from introspecting this client
  name: 'ShopClient',
  version: '1.0',
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
          invoices: {
            merge: false,
          },
          customers: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache', // Force network requests to bypass cache
    },
    query: {
      fetchPolicy: 'no-cache', // Force network requests to bypass cache
    },
  },
});

// Export a getter function for the Apollo client
export const getApolloClient = () => apolloClient;
export const getShopApolloClient = () => shopApolloClient;
