import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Endpoint used to check whether the app/backend is healthy again. Defaults to the gateway GraphQL ping. */
  healthCheckUrl?: string;
  /** How often (ms) to re-check the health endpoint while an error is displayed. */
  healthCheckIntervalMs?: number;
  /** How long (ms) the app must run without errors before the auto-reload guard resets. */
  healthyResetMs?: number;
}

type HealthStatus = 'idle' | 'checking' | 'unhealthy' | 'healthy';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  healthStatus: HealthStatus;
  autoReloadUsed: boolean;
}

// Guard against auto-reload loops: the boundary auto-reloads at most once per
// failure, then falls back to manual buttons. The guard is re-armed once the app
// has been healthy for a while (see healthyResetMs).
const AUTO_RELOAD_KEY = 'erp-error-boundary:auto-reloaded';
const DEFAULT_HEALTH_CHECK_URL = '/graphql';
const DEFAULT_HEALTH_INTERVAL_MS = 5000;
const DEFAULT_HEALTHY_RESET_MS = 20000;
const HEALTH_FETCH_TIMEOUT_MS = 8000;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private healthTimer?: number;
  private healthyResetTimer?: number;
  private healthCheckInFlight = false;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, healthStatus: 'idle', autoReloadUsed: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, healthStatus: 'checking', autoReloadUsed: false };
  }

  componentDidMount() {
    // When the app loads without an error, re-arm the auto-reload guard after a short
    // healthy period so a future transient outage can auto-recover again.
    if (!this.state.hasError) {
      this.healthyResetTimer = window.setTimeout(() => {
        sessionStorage.removeItem(AUTO_RELOAD_KEY);
      }, this.props.healthyResetMs ?? DEFAULT_HEALTHY_RESET_MS);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error, then start periodic health checks so the page can recover
    // automatically once the service is healthy again.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    void this.runHealthCheck();
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    if (this.state.hasError && !prevState.hasError) {
      void this.runHealthCheck();
    } else if (!this.state.hasError && prevState.hasError) {
      this.stopHealthCheck();
    }
  }

  componentWillUnmount() {
    this.stopHealthCheck();
    if (this.healthyResetTimer) window.clearTimeout(this.healthyResetTimer);
  }

  private stopHealthCheck() {
    if (this.healthTimer) window.clearTimeout(this.healthTimer);
    this.healthTimer = undefined;
  }

  private async runHealthCheck() {
    if (this.healthCheckInFlight) return;
    this.healthCheckInFlight = true;
    try {
      const healthy = await this.checkHealth();
      if (healthy) {
        this.handleHealthy();
        return;
      }
      if (!this.state.hasError) return; // recovered in the meantime
      this.setState({ healthStatus: 'unhealthy' });
      this.scheduleNextHealthCheck();
    } finally {
      this.healthCheckInFlight = false;
    }
  }

  private scheduleNextHealthCheck() {
    if (!this.state.hasError) return;
    this.stopHealthCheck();
    this.healthTimer = window.setTimeout(() => {
      void this.runHealthCheck();
    }, this.props.healthCheckIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS);
  }

  private async checkHealth(): Promise<boolean> {
    const url = this.props.healthCheckUrl ?? DEFAULT_HEALTH_CHECK_URL;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), HEALTH_FETCH_TIMEOUT_MS);
    try {
      const isGraphQl = url.endsWith('/graphql');
      const res = await fetch(url, {
        method: isGraphQl ? 'POST' : 'GET',
        headers: isGraphQl ? { 'Content-Type': 'application/json' } : undefined,
        body: isGraphQl ? JSON.stringify({ query: '{ __typename }' }) : undefined,
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private handleHealthy() {
    if (!this.state.hasError) return;
    this.setState({ healthStatus: 'healthy' });

    if (sessionStorage.getItem(AUTO_RELOAD_KEY) === '1') {
      // An automatic reload already happened for this failure — avoid a reload loop.
      this.setState({ autoReloadUsed: true });
      return;
    }

    sessionStorage.setItem(AUTO_RELOAD_KEY, '1');
    // Give the user a moment to see the "recovering" state, then reload to a healthy page.
    window.setTimeout(() => window.location.reload(), 800);
  }

  private handleTryAgain = () => {
    this.stopHealthCheck();
    this.setState({ hasError: false, error: undefined, healthStatus: 'idle', autoReloadUsed: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToDashboard = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const statusLine =
        this.state.healthStatus === 'healthy'
          ? 'Service is back — reloading…'
          : this.state.healthStatus === 'unhealthy'
          ? 'Service unreachable — will keep checking…'
          : 'Checking service status…';

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
          <div className="w-full max-w-md rounded-lg border border-red-300 bg-white p-6 text-center shadow-sm dark:border-red-700 dark:bg-gray-800">
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              We're having trouble loading this page.
            </p>
            {this.state.error?.message && (
              <p className="mt-2 break-words rounded bg-gray-100 p-2 font-mono text-xs text-red-600 dark:bg-gray-900 dark:text-red-400">
                {this.state.error.message}
              </p>
            )}

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  this.state.healthStatus === 'healthy'
                    ? 'bg-green-500'
                    : this.state.healthStatus === 'unhealthy'
                    ? 'bg-red-500'
                    : 'animate-pulse bg-yellow-400'
                }`}
              />
              {statusLine}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleTryAgain}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Reload page
              </button>
              <button
                onClick={this.handleGoToDashboard}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Go to Dashboard
              </button>
            </div>

            {this.state.autoReloadUsed && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Automatic reload was already used for this issue. Please use one of the buttons above.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}