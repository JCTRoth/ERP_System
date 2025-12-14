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
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      // Skip logging for unavailable services
      if (message.includes('translations') || message.includes('customers') || message.includes('Unknown type')) {
        return;
      }
      console.error(`[GraphQL error]: ${operation.operationName}: ${message}`);
    });
  }
  if (networkError) {
    // Only log actual network errors, not GraphQL 400 responses
    if ('statusCode' in networkError && networkError.statusCode !== 400) {
      console.error(`[Network error]: ${networkError}`);
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
