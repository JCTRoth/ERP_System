import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ApolloServer } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { expressMiddleware } from '@apollo/server/express4';
import { Kind, parse } from 'graphql';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

console.log('===== GATEWAY STARTING =====');
console.log('SHOP_SERVICE_URL:', process.env.SHOP_SERVICE_URL);
console.log('ORDERS_SERVICE_URL:', process.env.ORDERS_SERVICE_URL);
console.log('MASTERDATA_SERVICE_URL:', process.env.MASTERDATA_SERVICE_URL);
console.log('COMPANY_SERVICE_URL:', process.env.COMPANY_SERVICE_URL);

process.env.DEBUG = 'apollo:gateway';

const PORT = process.env.PORT || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_KEY ||
  'your-super-secret-key-at-least-256-bits-long-for-hs256';

const PUBLIC_FIELDS = new Set([
  '__schema',
  '__type',
  '__typename',
  'login',
  'refreshToken',
  'requestPasswordReset',
  'resetPassword',
  'verifyEmail',
  'register',
  'test',
]);

const AUTH_ONLY_FIELDS = new Set([
  'logout',
  'changePassword',
  'switchCompany',
  'me',
  'currentUser',
  'meAuthorization',
]);

const INTERNAL_ONLY_FIELDS = new Set(['authorizationContext']);

const EXACT_FIELD_RULES = {
  company: { permission: 'company.company.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  companyByName: { permission: 'company.company.read', allowGlobalWithoutCompany: true },
  companies: { permission: 'company.company.read', allowGlobalWithoutCompany: true },
  totalCompanies: { permission: 'company.company.read', allowGlobalWithoutCompany: true },
  assignment: { permission: 'company.assignment.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  assignmentsByCompany: { permission: 'company.assignment.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  groupsByCompany: { permission: 'company.group.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  permissionsCatalog: { permission: 'company.group.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  assignUserToCompany: { permission: 'company.assignment.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  updateAssignmentRole: { permission: 'company.assignment.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  removeUserFromCompany: { permission: 'company.assignment.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  assignUserGroups: { permission: 'company.group.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  upsertGroup: { permission: 'company.group.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  deleteGroup: { permission: 'company.group.manage', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  dynamicFieldDefinitions: { permission: 'masterdata.record.read', requireCompanyContext: true },
  dynamicFieldDefinitionsByEntity: { permission: 'masterdata.record.read', requireCompanyContext: true },
  dynamicFieldValues: { permission: 'masterdata.record.read', requireCompanyContext: true },
  createDynamicFieldDefinition: { permission: 'masterdata.record.manage', requireCompanyContext: true },
  updateDynamicFieldDefinition: { permission: 'masterdata.record.manage', requireCompanyContext: true },
  deleteDynamicFieldDefinition: { permission: 'masterdata.record.manage', requireCompanyContext: true },
  setDynamicFieldValue: { permission: 'masterdata.record.manage', requireCompanyContext: true },
  deleteDynamicFieldValue: { permission: 'masterdata.record.manage', requireCompanyContext: true },
  users: { permission: 'user.user.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  user: { permission: 'user.user.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  userByEmail: { permission: 'user.user.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  totalUsers: { permission: 'user.user.read', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  updateUser: { permission: 'user.user.update', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  deactivateUser: { permission: 'user.user.deactivate', requireCompanyContext: true, allowGlobalWithoutCompany: true },
  activateUser: { permission: 'user.user.deactivate', requireCompanyContext: true, allowGlobalWithoutCompany: true },
};

const PREFIX_RULES = [
  {
    prefixes: ['products', 'product', 'categories', 'category', 'brands', 'brand', 'shopSuppliers', 'shopSupplier', 'shippingMethod', 'shippingMethods', 'coupon', 'coupons', 'cart', 'stock', 'inventory', 'audit'],
    queryPermission: 'shop.product.read',
    mutationPermission: 'shop.product.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['shopOrders', 'shopOrder', 'recentOrders', 'createShopOrder', 'updateShopOrderStatus', 'cancelShopOrder', 'deleteShopOrder'],
    queryPermission: 'orders.order.read',
    mutationPermission: 'orders.order.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['orders', 'order', 'taxCode'],
    queryPermission: 'orders.order.read',
    mutationPermission: 'orders.order.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['accounts', 'account', 'chartOfAccounts', 'invoices', 'invoice', 'journal', 'paymentRecord', 'paymentRecords', 'bankAccount', 'bankAccounts', 'balanceSheet', 'incomeStatement'],
    queryPermission: 'accounting.record.read',
    mutationPermission: 'accounting.record.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['customers', 'customer', 'suppliers', 'supplier', 'employees', 'employee', 'departments', 'department', 'assets', 'asset', 'currencies', 'currency', 'paymentTerms', 'paymentTerm', 'unitsOfMeasure', 'unitOfMeasure'],
    queryPermission: 'masterdata.record.read',
    mutationPermission: 'masterdata.record.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['translation'],
    queryPermission: 'translation.translation.read',
    mutationPermission: 'translation.translation.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['template'],
    queryPermission: 'template.template.read',
    mutationPermission: 'template.template.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['notification'],
    queryPermission: 'notification.notification.read',
    mutationPermission: 'notification.notification.manage',
    requireCompanyContext: true,
  },
  {
    prefixes: ['script', 'page', 'customPage'],
    queryPermission: 'scripting.script.read',
    mutationPermission: 'scripting.script.manage',
    requireCompanyContext: true,
  },
];

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

function base64UrlToBuffer(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return Buffer.from(padded, 'base64');
}

function toBase64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseBoolean(value) {
  return value === true || value === 'true';
}

function parseClaimValues(payload, claimName) {
  const raw = payload?.[claimName];
  if (raw == null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean);
        }
      } catch {
      }
    }

    if (trimmed.includes(',')) {
      return trimmed.split(',').map(item => item.trim()).filter(Boolean);
    }

    return [trimmed];
  }

  return [String(raw)];
}

function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlToBuffer(encodedHeader).toString('utf8'));
  const payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString('utf8'));

  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  const expectedSignature = toBase64Url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest()
  );

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(encodedSignature);
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error('Invalid JWT signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) {
    throw new Error('JWT expired');
  }

  if (payload.nbf && now < payload.nbf) {
    throw new Error('JWT not active yet');
  }

  return payload;
}

function buildAuthContext(req) {
  const authorization = req.headers.authorization || '';
  const language = req.headers['accept-language']?.split(',')[0] || 'en';

  if (!authorization.startsWith('Bearer ')) {
    return {
      authorization: authorization || null,
      isAuthenticated: false,
      userId: null,
      companyId: null,
      platformRole: null,
      companyRole: null,
      isGlobalSuperAdmin: false,
      permissionCodes: [],
      groupCodes: [],
      language,
    };
  }

  const token = authorization.slice('Bearer '.length).trim();
  const payload = verifyJwt(token);
  const platformRole = payload.platform_role || payload.role || null;

  return {
    authorization,
    isAuthenticated: true,
    userId: payload.sub || payload.nameid || null,
    companyId: payload.company_id || null,
    platformRole,
    companyRole: payload.company_role || null,
    isGlobalSuperAdmin: parseBoolean(payload.is_global_super_admin) || ['SUPER_ADMIN', 'ADMIN'].includes(String(platformRole || '').toUpperCase()),
    permissionCodes: parseClaimValues(payload, 'permission_code'),
    groupCodes: parseClaimValues(payload, 'group_code'),
    language,
    rawClaims: payload,
  };
}

function getOperationDefinition(document, operationName) {
  const operations = document.definitions.filter(definition => definition.kind === Kind.OPERATION_DEFINITION);
  if (operations.length === 0) {
    return null;
  }

  if (operationName) {
    return operations.find(definition => definition.name?.value === operationName) || null;
  }

  return operations[0] || null;
}

function resolveValueNode(node, variables) {
  if (!node) {
    return null;
  }

  switch (node.kind) {
    case Kind.VARIABLE:
      return variables?.[node.name.value] ?? null;
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

function getArgumentValue(fieldNode, argumentName, variables) {
  const argument = fieldNode.arguments?.find(item => item.name.value === argumentName);
  return resolveValueNode(argument?.value, variables);
}

function normalizeId(value) {
  return value == null ? null : String(value).trim().toLowerCase();
}

function hasPermission(authContext, permissionCode) {
  if (authContext.isGlobalSuperAdmin) {
    return true;
  }

  return authContext.permissionCodes.some(code => code.toLowerCase() === permissionCode.toLowerCase());
}

function lookupRule(fieldName, operationType) {
  if (EXACT_FIELD_RULES[fieldName]) {
    return EXACT_FIELD_RULES[fieldName];
  }

  const normalizedFieldName = fieldName.toLowerCase();
  for (const candidate of PREFIX_RULES) {
    const matched = candidate.prefixes.some(prefix => normalizedFieldName.startsWith(prefix.toLowerCase()));
    if (matched) {
      return {
        permission: operationType === 'mutation' ? candidate.mutationPermission : candidate.queryPermission,
        requireCompanyContext: candidate.requireCompanyContext,
      };
    }
  }

  return null;
}

function formatGraphQLError(message, code, status = 403) {
  return {
    status,
    body: {
      errors: [
        {
          message,
          extensions: { code },
        },
      ],
    },
  };
}

function authorizeField(fieldNode, operationType, authContext, variables) {
  const fieldName = fieldNode.name.value;

  if (PUBLIC_FIELDS.has(fieldName)) {
    return null;
  }

  if (INTERNAL_ONLY_FIELDS.has(fieldName)) {
    return formatGraphQLError(`Field ${fieldName} is not exposed through the gateway`, 'FORBIDDEN');
  }

  if (AUTH_ONLY_FIELDS.has(fieldName)) {
    if (!authContext.isAuthenticated) {
      return formatGraphQLError(`Authentication required for ${fieldName}`, 'UNAUTHENTICATED', 401);
    }
    return null;
  }

  if (fieldName === 'companiesByUser' || fieldName === 'assignmentsByUser') {
    if (!authContext.isAuthenticated) {
      return formatGraphQLError(`Authentication required for ${fieldName}`, 'UNAUTHENTICATED', 401);
    }

    const requestedUserId = normalizeId(getArgumentValue(fieldNode, 'userId', variables));
    if (requestedUserId && requestedUserId === normalizeId(authContext.userId)) {
      return null;
    }

    if (authContext.isGlobalSuperAdmin) {
      return null;
    }

    return formatGraphQLError(`Only the current user can access ${fieldName}`, 'FORBIDDEN');
  }

  const rule = lookupRule(fieldName, operationType);
  if (!rule) {
    if (!authContext.isAuthenticated) {
      return formatGraphQLError(`Authentication required for ${fieldName}`, 'UNAUTHENTICATED', 401);
    }
    return null;
  }

  if (!authContext.isAuthenticated) {
    return formatGraphQLError(`Authentication required for ${fieldName}`, 'UNAUTHENTICATED', 401);
  }

  if (rule.requireCompanyContext && !authContext.companyId && !(authContext.isGlobalSuperAdmin && rule.allowGlobalWithoutCompany)) {
    return formatGraphQLError(`A company context is required for ${fieldName}`, 'FORBIDDEN');
  }

  if (rule.permission && !hasPermission(authContext, rule.permission)) {
    return formatGraphQLError(`Missing permission ${rule.permission}`, 'FORBIDDEN');
  }

  return null;
}

function authorizeGraphqlRequest(req, res, next) {
  let authContext;
  try {
    authContext = buildAuthContext(req);
  } catch (error) {
    console.error('JWT validation failed:', error.message);
    const failure = formatGraphQLError('Invalid or expired access token', 'UNAUTHENTICATED', 401);
    return res.status(failure.status).json(failure.body);
  }

  req.authContext = authContext;

  const body = req.body || {};
  const query = body.query;
  if (typeof query !== 'string' || !query.trim()) {
    return next();
  }

  let document;
  try {
    document = parse(query);
  } catch {
    return next();
  }

  const operationDefinition = getOperationDefinition(document, body.operationName);
  if (!operationDefinition) {
    return next();
  }

  for (const selection of operationDefinition.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      continue;
    }

    const failure = authorizeField(selection, operationDefinition.operation, authContext, body.variables || {});
    if (failure) {
      return res.status(failure.status).json(failure.body);
    }
  }

  return next();
}

function shouldProxyDirectToUserService(body) {
  const query = body?.query;
  if (typeof query !== 'string' || !query.trim()) {
    return false;
  }

  try {
    const document = parse(query);
    const operationDefinition = getOperationDefinition(document, body.operationName);
    if (!operationDefinition) {
      return false;
    }

    const fields = operationDefinition.selectionSet.selections
      .filter(selection => selection.kind === Kind.FIELD)
      .map(selection => selection.name.value);

    return fields.length > 0 && fields.every(fieldName => PUBLIC_FIELDS.has(fieldName));
  } catch {
    return false;
  }
}

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.authorization) {
      request.http.headers.set('Authorization', context.authorization);
    }
    if (context.userId) {
      request.http.headers.set('X-User-Id', context.userId);
    }
    if (context.companyId) {
      request.http.headers.set('X-Company-Id', context.companyId);
    }
    request.http.headers.set('X-Is-Global-Super-Admin', String(Boolean(context.isGlobalSuperAdmin)));
    if (context.permissionCodes?.length) {
      request.http.headers.set('X-Permission-Codes', context.permissionCodes.join(','));
    }
    if (context.groupCodes?.length) {
      request.http.headers.set('X-Group-Codes', context.groupCodes.join(','));
    }
    if (context.language) {
      request.http.headers.set('Accept-Language', context.language);
    }
  }
}

const allSubgraphs = [
  process.env.USER_SERVICE_URL && { name: 'user-service', url: process.env.USER_SERVICE_URL },
  process.env.COMPANY_SERVICE_URL && { name: 'company-service', url: process.env.COMPANY_SERVICE_URL },
  process.env.MASTERDATA_SERVICE_URL && { name: 'masterdata-service', url: process.env.MASTERDATA_SERVICE_URL },
  process.env.ACCOUNTING_SERVICE_URL && { name: 'accounting-service', url: process.env.ACCOUNTING_SERVICE_URL },
  process.env.TRANSLATION_SERVICE_URL && { name: 'translation-service', url: process.env.TRANSLATION_SERVICE_URL },
  process.env.NOTIFICATION_SERVICE_URL && { name: 'notification-service', url: process.env.NOTIFICATION_SERVICE_URL },
  process.env.SHOP_SERVICE_URL && { name: 'shop-service', url: process.env.SHOP_SERVICE_URL },
  process.env.ORDERS_SERVICE_URL && { name: 'orders-service', url: process.env.ORDERS_SERVICE_URL },
].filter(Boolean);

console.log('All subgraphs before filtering:', JSON.stringify(allSubgraphs, null, 2));

const subgraphs = allSubgraphs.filter(subgraph => subgraph.url && subgraph.url.trim() !== '');

console.log('Subgraphs after filtering:', JSON.stringify(subgraphs, null, 2));

function createApolloServer() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs,
      pollIntervalInMs: 15000,
      async onFailureToCompose(err) {
        console.error('Failed to compose supergraph:', err.message);
        console.log('Gateway will retry composition...');
      },
      subgraphHealthCheck: true,
      request: {
        timeout: 30000,
      },
      initialCompositionDelayMs: 60000,
      async onUpdateSupergraphSdl(prev) {
        if (!prev) console.log('Initial supergraph composed');
        else console.log('Supergraph updated');
      }
    }),
    buildService({ name, url }) {
      console.log(`Building service ${name} with URL ${url}`);
      return new AuthenticatedDataSource({ url });
    },
    didFailComposingGraph() {
      console.log('Initial composition failed, gateway will retry...');
      return;
    },
  });

  gateway.onSchemaLoadOrUpdate(({ apiSchema }) => {
    console.log('Gateway schema loaded/updated');
    console.log(`API Schema has ${apiSchema.getQueryType()?.getFields() ? Object.keys(apiSchema.getQueryType().getFields()).length : 0} query fields`);
  });

  return new ApolloServer({
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
    introspection: process.env.NODE_ENV === 'development',
  });
}

async function startServer() {
  const app = express();
  let graphqlReady = false;
  let graphqlStartupError = null;
  let graphqlStartupInProgress = false;
  let graphqlMiddlewareMounted = false;

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      graphqlReady,
      graphqlStartupError,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', (req, res) => {
    if (!graphqlReady) {
      return res.status(503).json({
        status: 'starting',
        graphqlReady,
        graphqlStartupError,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      status: 'ready',
      graphqlReady,
      graphqlStartupError,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/graphql', express.json(), async (req, res, next) => {
    try {
      if (shouldProxyDirectToUserService(req.body)) {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5000/graphql/';
        try {
          const response = await fetch(userServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
          });
          const data = await response.json();
          return res.status(response.status).json(data);
        } catch (err) {
          console.error('Direct auth proxy to user-service failed:', err.message || err);
          return res.status(502).json({ errors: [{ message: 'User service unavailable' }] });
        }
      }
    } catch (err) {
      console.error('Auth proxy error:', err);
    }

    if (!graphqlReady) {
      return res.status(503).json({
        errors: [{
          message: 'Gateway schema is still initializing',
          code: 'GATEWAY_INITIALIZING',
        }],
      });
    }

    return next();
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gateway HTTP server listening at http://0.0.0.0:${PORT}`);
    console.log(`Login proxy available at http://0.0.0.0:${PORT}/graphql`);
    console.log(`Shop service proxy at http://0.0.0.0:${PORT}/shop/graphql`);
    console.log(`Metrics available at http://0.0.0.0:${PORT}/metrics`);
    console.log(`Health check at http://0.0.0.0:${PORT}/health`);
    console.log(`Readiness check at http://0.0.0.0:${PORT}/ready`);
  });

  async function waitForService(url, timeoutMs = 10000, intervalMs = 2000) {
    const start = Date.now();

    try {
      const parsed = new URL(url);
      const base = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
      const healthCandidates = [`${base}/actuator/health`, `${base}/health`, url];

      while (Date.now() - start < timeoutMs) {
        for (const candidate of healthCandidates) {
          try {
            if (candidate.endsWith('/health') || candidate.endsWith('/actuator/health')) {
              const r = await fetch(candidate, { method: 'GET' });
              if (r && r.ok) return true;
            } else {
              const r = await fetch(candidate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: '{__typename}' }),
              });
              if (r && r.ok) return true;
            }
          } catch {
          }
        }

        await new Promise(r => setTimeout(r, intervalMs));
      }
    } catch (err) {
      console.warn('Error parsing URL for subgraph probing', url, err.message || err);
    }

    return false;
  }

  async function startGraphqlGateway() {
    if (graphqlReady || graphqlStartupInProgress) {
      return;
    }

    graphqlStartupInProgress = true;
    console.log('Waiting for services to initialize before starting Apollo Server...');

    for (const sg of subgraphs) {
      console.log(`Probing subgraph ${sg.name} at ${sg.url}`);
      const ok = await waitForService(sg.url);
      if (!ok) {
        console.warn(`Subgraph ${sg.name} did not become available within timeout (${sg.url}). Gateway will still attempt composition but may retry.`);
      } else {
        console.log(`Subgraph ${sg.name} is reachable`);
      }
    }

    try {
      const apolloServer = createApolloServer();
      await apolloServer.start();

      if (!graphqlMiddlewareMounted) {
        app.use('/graphql', express.json(), authorizeGraphqlRequest, expressMiddleware(apolloServer, {
          context: async ({ req }) => req.authContext || buildAuthContext(req),
        }));
        graphqlMiddlewareMounted = true;
      }

      graphqlReady = true;
      graphqlStartupError = null;
      console.log('Apollo GraphQL middleware mounted');
    } catch (error) {
      graphqlStartupError = error.message;
      console.error('GraphQL gateway initialization failed:', error.message);

      setTimeout(() => {
        void startGraphqlGateway();
      }, 15000);
    } finally {
      graphqlStartupInProgress = false;
    }
  }

  void startGraphqlGateway();

  app.use('/shop/graphql', express.json(), authorizeGraphqlRequest, async (req, res) => {
    const startTime = Date.now();
    const requestId = `shop-${startTime}`;
    const authContext = req.authContext || buildAuthContext(req);

    console.log(`${requestId} Shop proxy request started`);
    console.log(`${requestId} Headers:`, {
      authorization: authContext.authorization ? 'present' : 'missing',
      userId: authContext.userId || 'missing',
      companyId: authContext.companyId || 'missing',
      language: authContext.language || 'missing',
      'user-agent': req.headers['user-agent'] || 'missing'
    });
    console.log(`${requestId} Query: ${req.body?.query?.substring(0, 200)}...`);
    console.log(`${requestId} Variables:`, req.body?.variables);

    try {
      const shopServiceUrl = process.env.SHOP_SERVICE_URL || 'http://shop-service:5003/graphql';

      const response = await fetch(shopServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authContext.authorization || '',
          'X-User-Id': authContext.userId || '',
          'X-Company-Id': authContext.companyId || '',
          'X-Is-Global-Super-Admin': String(Boolean(authContext.isGlobalSuperAdmin)),
          'X-Permission-Codes': authContext.permissionCodes.join(','),
          'X-Group-Codes': authContext.groupCodes.join(','),
          'Accept-Language': authContext.language || 'en',
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`${requestId} Shop proxy response status: ${response.status} (${duration}ms)`);

      if (response.status !== 200) {
        console.error(`${requestId} Non-200 response from shop service:`, data);
      }

      res.status(response.status).json(data);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${requestId} Shop service proxy error after ${duration}ms:`, error);
      console.error(`${requestId} Error stack:`, error.stack);

      if (error.name === 'TimeoutError') {
        res.status(504).json({
          errors: [{
            message: 'Shop service request timed out',
            code: 'SHOP_TIMEOUT',
            requestId
          }]
        });
      } else if (error.name === 'AbortError') {
        res.status(503).json({
          errors: [{
            message: 'Shop service temporarily unavailable',
            code: 'SHOP_UNAVAILABLE',
            requestId
          }]
        });
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        res.status(503).json({
          errors: [{
            message: 'Shop service connection failed',
            code: 'SHOP_CONNECTION_FAILED',
            requestId
          }]
        });
      } else {
        res.status(500).json({
          errors: [{
            message: 'Shop service unavailable',
            details: error.message,
            code: 'SHOP_ERROR',
            requestId
          }]
        });
      }
    }
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
});
