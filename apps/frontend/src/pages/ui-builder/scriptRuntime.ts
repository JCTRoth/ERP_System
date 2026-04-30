/**
 * ERP Script Runtime — provides ERP.query() and ERP.mutate() helpers
 * for UI Builder scripts to load and write data from/to ERP services.
 *
 * Scripts execute client-side. Database access is proxied through the
 * scripting service's /api/data endpoint, which forwards GraphQL requests
 * to the target service with the user's auth token. Each target service
 * enforces its own access control (company filtering, permissions).
 *
 * Available in scripts as the global `ERP` object.
 */

import { useAuthStore } from '../../stores/authStore';

/**
 * Execute a GraphQL query against an ERP service via the data proxy.
 */
async function queryService(
  service: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const token = useAuthStore.getState().accessToken;
  const companyId = useAuthStore.getState().currentCompanyId;

  const response = await fetch('/api/data/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
    body: JSON.stringify({ service, query, variables }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Query failed (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }
  return result.data;
}

/**
 * Execute a GraphQL mutation against an ERP service via the data proxy.
 */
async function mutateService(
  service: string,
  mutation: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const token = useAuthStore.getState().accessToken;
  const companyId = useAuthStore.getState().currentCompanyId;

  const response = await fetch('/api/data/mutate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
    body: JSON.stringify({ service, query: mutation, variables }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Mutation failed (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }
  return result.data;
}

/**
 * Build the ERP runtime object injected into script contexts.
 * All methods are async — scripts should use `await ERP.query(...)`.
 */
export function createERPRuntime() {
  return {
    /**
     * Query data from an ERP service.
     * @param service - Target service: 'masterdata' | 'shop' | 'accounting' | 'user' | 'company' | 'gateway'
     * @param query - GraphQL query string, e.g. '{ customers { nodes { id name } } }'
     * @param variables - Optional GraphQL variables
     * @returns The `data` field from the GraphQL response
     *
     * @example
     * const data = await ERP.query('masterdata', '{ customers { nodes { id name email } } }');
     * console.log(data.customers.nodes);
     */
    query: queryService,

    /**
     * Execute a mutation against an ERP service.
     * @param service - Target service name
     * @param mutation - GraphQL mutation string (must start with 'mutation')
     * @param variables - Optional GraphQL variables
     * @returns The `data` field from the GraphQL response
     *
     * @example
     * const data = await ERP.mutate('masterdata',
     *   'mutation { createCustomer(input: { name: "New Corp", type: "Company" }) { id name } }');
     * console.log(data.createCustomer.id);
     */
    mutate: mutateService,

    // Utility functions (same as before but available client-side)
    round: (num: number, decimals = 0) =>
      Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
    sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
    avg: (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
    isEmail: (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
    isUUID: (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str),
    now: () => Date.now(),
    formatDate: (ts: number) => new Date(ts).toISOString(),
    slugify: (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  };
}

/**
 * Build the `new Function()` wrapper that executes a script with ERP helpers.
 * Supports async scripts (await ERP.query(...)).
 */
export function executeScriptWithERP(
  script: string,
  component: { id: string; props?: { label?: string } },
  event: Event | { type: string; target: null },
  mockConsole: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
  },
  options?: {
    allowDOM?: boolean;
    allowFetch?: boolean;
  },
): Promise<string[]> {
  const logs: string[] = [];
  const wrappedConsole = {
    log: (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      logs.push(msg);
      mockConsole.log(...args);
    },
    warn: (...args: unknown[]) => {
      const msg = '[WARN] ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      logs.push(msg);
      mockConsole.warn(...args);
    },
    error: (...args: unknown[]) => {
      const msg = '[ERROR] ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      logs.push(msg);
      mockConsole.error(...args);
    },
    info: (...args: unknown[]) => {
      const msg = '[INFO] ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      logs.push(msg);
      (mockConsole.info || mockConsole.log)(...args);
    },
  };

  const erpRuntime = createERPRuntime();

  // Build async function to support await
  const fn = new Function(
    'event',
    'componentId',
    'console',
    'alert',
    'document',
    'fetch',
    'ERP',
    `return (async () => { ${script} })();`,
  );

  return fn(
    event,
    component.id,
    wrappedConsole,
    (msg: string) => {
      logs.push(`[ALERT] ${msg}`);
      if (options?.allowDOM !== false) alert(msg);
    },
    options?.allowDOM !== false ? document : undefined,
    options?.allowFetch !== false ? fetch : undefined,
    erpRuntime,
  )
    .then(() => logs)
    .catch((err: Error) => {
      logs.push(`[ERROR] ${err.message}`);
      return logs;
    });
}
