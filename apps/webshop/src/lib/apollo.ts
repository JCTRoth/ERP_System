import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
  uri: "/graphql",
});

// The webshop operates under a single company context
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID || "ae161374-7185-4aa5-97f4-bcb35cf0ae19";

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    "X-Company-Id": COMPANY_ID,
  },
}));

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
