import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// A child component that throws when the shared flag is set.
let throwNow = true;
function Bomb(): JSX.Element {
  if (throwNow) {
    throw new Error('boom');
  }
  return <div>recovered content</div>;
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location;
  const mockReload = vi.fn();

  beforeEach(() => {
    throwNow = true;
    sessionStorage.clear();
    mockReload.mockClear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // jsdom does not implement navigation — stub location so we can assert on it.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: mockReload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllGlobals();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows the fallback with the error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();
  });

  it('re-renders children when "Try again" is clicked', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    throwNow = false;
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });

  it('reloads the page when "Reload page" is clicked', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Reload page/i }));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('navigates to the dashboard when "Go to Dashboard" is clicked', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Go to Dashboard/i }));
    expect(window.location.href).toBe('/');
  });

  it('auto-reloads when the periodic health check reports healthy', async () => {
    // First check fails (service down), second check succeeds (service back).
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ ok: true } as Response)
    );

    render(
      <ErrorBoundary healthCheckIntervalMs={10}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // First check -> unhealthy -> schedule next check (10ms) -> second check healthy
    // -> auto-reload scheduled after 800ms.
    await vi.waitFor(() => {
      expect(mockReload).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it('does not auto-reload twice for the same failure (loop guard)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
    sessionStorage.setItem('erp-error-boundary:auto-reloaded', '1');

    render(
      <ErrorBoundary healthCheckIntervalMs={10}>
        <Bomb />
      </ErrorBoundary>
    );

    // Health check is healthy, but the guard already fired once -> no auto reload.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(mockReload).not.toHaveBeenCalled();
    // Manual buttons are still available.
    expect(screen.getByRole('button', { name: /Reload page/i })).toBeInTheDocument();
    expect(screen.getByText(/Automatic reload was already used/i)).toBeInTheDocument();
  });
});
