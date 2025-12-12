import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import LoginPage from '../pages/auth/LoginPage';

// Mock the auth store
const mockSetAuth = vi.fn();
vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      setAuth: mockSetAuth,
      isAuthenticated: false,
    }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows demo credentials', () => {
    render(<LoginPage />);
    
    expect(screen.getByText(/admin@erp-system.local/)).toBeInTheDocument();
  });

  it('updates input values when typing', () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('has a link to forgot password page', () => {
    render(<LoginPage />);
    
    const forgotLink = screen.getByText(/forgot password/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/auth/forgot-password');
  });
});
