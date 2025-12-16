import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { expressMiddleware } from '@apollo/server/express4';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

// Enable debug logging
process.env.DEBUG = 'apollo:gateway';

const PORT = process.env.PORT || 4000;

// Prometheus metrics
const register = new Registry();
collectDefaultMetrics({ register });

const graphqlRequestCounter = new Counter({
  name: 'graphql_requests_total',
  help: 'Total GraphQL requests',
  labelNames: ['operation', 'status'],
  registers: [register]
});

const graphqlRequestDuration = new Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL request duration',
  labelNames: ['operation'],
  registers: [register]
});

// Custom data source to forward headers
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Forward authentication header
    if (context.authorization) {
      request.http.headers.set('Authorization', context.authorization);
    }
    // Forward user context
    if (context.userId) {
      request.http.headers.set('X-User-Id', context.userId);
    }
    if (context.companyId) {
      request.http.headers.set('X-Company-Id', context.companyId);
    }
    if (context.language) {
      request.http.headers.set('Accept-Language', context.language);
    }
  }
}

// Define subgraph services
const subgraphs = [
  { name: 'user-service', url: process.env.USER_SERVICE_URL || 'http://user-service:5000/graphql' },
  { name: 'translation-service', url: process.env.TRANSLATION_SERVICE_URL || 'http://translation-service:8081/graphql' },
  { name: 'company-service', url: process.env.COMPANY_SERVICE_URL || 'http://company-service:8080/graphql' },
  { name: 'shop-service', url: process.env.SHOP_SERVICE_URL || 'http://shop-service:5003/graphql' },
];

// Create gateway
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs,
    pollIntervalInMs: 10000, // Poll every 10 seconds for changes
    async onFailureToCompose(err) {
      console.error('Failed to compose supergraph:', err);
    },
    subgraphHealthCheck: true,
  }),
  buildService({ name, url }) {
    console.log(`Building service ${name} with URL ${url}`);
    return new AuthenticatedDataSource({ url });
  },
});

// Log when gateway is ready
gateway.onSchemaLoadOrUpdate(({ apiSchema, coreSupergraphSdl }) => {
  console.log('Gateway schema loaded/updated');
  console.log(`API Schema has ${apiSchema.getQueryType()?.getFields() ? Object.keys(apiSchema.getQueryType().getFields()).length : 0} query fields`);
});

// Create Apollo Server
const server = new ApolloServer({
  gateway,
  plugins: [
    {
      async requestDidStart() {
        const start = Date.now();
        return {
          async willSendResponse({ operation }) {
            const duration = (Date.now() - start) / 1000;
            const operationName = operation?.name?.value || 'anonymous';
            graphqlRequestDuration.labels(operationName).observe(duration);
            graphqlRequestCounter.labels(operationName, 'success').inc();
          },
          async didEncounterErrors({ operation }) {
            const operationName = operation?.name?.value || 'anonymous';
            graphqlRequestCounter.labels(operationName, 'error').inc();
          }
        };
      }
    }
  ],
  introspection: process.env.NODE_ENV !== 'production',
});

async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Prometheus metrics
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Start Apollo Server
  await server.start();

  // GraphQL middleware
  app.use('/graphql', express.json(), expressMiddleware(server, {
    context: async ({ req }) => ({
      authorization: req.headers.authorization,
      userId: req.headers['x-user-id'],
      companyId: req.headers['x-company-id'],
      language: req.headers['accept-language']?.split(',')[0] || 'en',
    }),
  }));

  app.listen(PORT, () => {
    console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error);
