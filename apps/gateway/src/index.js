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
  { name: 'company-service', url: process.env.COMPANY_SERVICE_URL || 'http://company-service:8080/graphql' },
  { name: 'masterdata-service', url: process.env.MASTERDATA_SERVICE_URL || 'http://masterdata-service:5002/graphql' },
  { name: 'accounting-service', url: process.env.ACCOUNTING_SERVICE_URL || 'http://accounting-service:5001/graphql' },
  { name: 'translation-service', url: process.env.TRANSLATION_SERVICE_URL || 'http://translation-service:8081/graphql' },
  { name: 'shop-service', url: process.env.SHOP_SERVICE_URL || 'http://shop-service:5003/graphql' },
  { name: 'orders-service', url: process.env.ORDERS_SERVICE_URL || 'http://orders-service:5004/graphql' },
];

// Create gateway
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs,
    pollIntervalInMs: 15000, // Poll every 15 seconds for changes
    async onFailureToCompose(err) {
      console.error('Failed to compose supergraph:', err.message);
      console.log('Gateway will retry composition...');
      // Don't throw, just log - allow gateway to continue serving
    },
    subgraphHealthCheck: true,
    // Increase timeout for slower startup environments
    request: {
      timeout: 30000, // 30 second timeout for introspection requests
    },
    // Slightly shorter initial composition delay but rely on per-request timeout
    initialCompositionDelayMs: 60000, // Wait 60 seconds before first composition attempt
    // Add simple retry/backoff logging hook
    async onUpdateSupergraphSdl(prev, next) {
      if (!prev) console.log('Initial supergraph composed');
      else console.log('Supergraph updated');
    }
  }),
  buildService({ name, url }) {
    console.log(`Building service ${name} with URL ${url}`);
    return new AuthenticatedDataSource({ url });
  },
  // Allow the gateway to start even if some services aren't available yet
  didFailComposingGraph() {
    console.log('Initial composition failed, gateway will retry...');
    // Don't exit on composition failure, just continue
    return;
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

  // Lightweight login proxy: handle login mutation directly against user-service
  // This allows the frontend to authenticate while federated subgraphs are composing
  app.post('/graphql', express.json(), async (req, res, next) => {
    try {
      const body = req.body || {};
      const query = body.query || '';
      // If this is a login mutation, forward directly to user-service
      if (typeof query === 'string' && /login\s*\(/i.test(query)) {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5000/graphql/';
        try {
          const response = await fetch(userServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          return res.status(response.status).json(data);
        } catch (err) {
          console.error('Login proxy to user-service failed:', err.message || err);
          return res.status(502).json({ errors: [{ message: 'User service unavailable' }] });
        }
      }
    } catch (err) {
      console.error('Login proxy error:', err);
    }
    // Not a login mutation - continue to Apollo middleware (registered later)
    return next();
  });

  // Prometheus metrics
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Add startup delay to allow services to initialize
  console.log('Waiting for services to initialize before starting Apollo Server...');
    // Wait for each subgraph URL to be reachable before attempting composition
    async function waitForService(url, timeoutMs = 120000, intervalMs = 2000) {
      const start = Date.now();
      // derive base URL (scheme + host[:port])
      try {
        const parsed = new URL(url);
        const base = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
        const healthCandidates = [`${base}/health`, `${base}/actuator/health`, url];

        while (Date.now() - start < timeoutMs) {
          for (const candidate of healthCandidates) {
            try {
              if (candidate.endsWith('/health') || candidate.endsWith('/actuator/health')) {
                const r = await fetch(candidate, { method: 'GET' });
                if (r && r.ok) return true;
              } else {
                // GraphQL endpoint probe
                const r = await fetch(candidate, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '{__typename}' }) });
                if (r && r.ok) return true;
              }
            } catch (err) {
              // ignore individual candidate failures
            }
          }
          await new Promise(r => setTimeout(r, intervalMs));
        }
      } catch (err) {
        // parsing error or other fatal issue
        console.warn('Error parsing URL for subgraph probing', url, err.message || err);
      }
      return false;
    }

    for (const sg of subgraphs) {
      console.log(`Probing subgraph ${sg.name} at ${sg.url}`);
      const ok = await waitForService(sg.url, 120000, 2000);
      if (!ok) {
        console.warn(`Subgraph ${sg.name} did not become available within timeout (${sg.url}). Gateway will still attempt composition but may retry.`);
      } else {
        console.log(`Subgraph ${sg.name} is reachable`);
      }
    }

  // Start Apollo Server; IntrospectAndCompose will poll subgraphs.
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

  // Shop service proxy (separate from federated graph due to type conflicts)
  app.use('/shop/graphql', express.json(), async (req, res) => {
    try {
      const shopServiceUrl = process.env.SHOP_SERVICE_URL || 'http://shop-service:5003/graphql';
      const response = await fetch(shopServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
          'X-User-Id': req.headers['x-user-id'] || '',
          'X-Company-Id': req.headers['x-company-id'] || '',
          'Accept-Language': req.headers['accept-language'] || 'en',
        },
        body: JSON.stringify(req.body),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Shop service proxy error:', error);
      res.status(500).json({ errors: [{ message: 'Shop service unavailable' }] });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);
    console.log(`🛒 Shop service proxy at http://localhost:${PORT}/shop/graphql`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  // Exit so Docker can restart the container
  process.exit(1);
});
