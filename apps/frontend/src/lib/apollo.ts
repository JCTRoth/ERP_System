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

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
      
      // Handle authentication errors
      if (message.includes('Unauthorized') || message.includes('jwt expired')) {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
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
