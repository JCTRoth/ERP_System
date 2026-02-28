import { useState } from 'react';
import { EyeIcon, EyeSlashIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../providers/I18nProvider';
import { authService } from '../../services/authService';
import { useAuthStore, CompanyAssignment } from '../../stores/authStore';

type LoginStep = 'credentials' | 'company-select';

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState<CompanyAssignment[]>([]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login({ email, password });
      if (result.user) {
        // Fetch assignments from store (set by authService.login)
        const storeAssignments = useAuthStore.getState().companyAssignments;
        const isSuperAdmin = result.user.role === 'admin' || 
          storeAssignments.some(a => a.role === 'SUPER_ADMIN');

        if (isSuperAdmin && storeAssignments.length === 0) {
          // Super admin with no assignments — skip company selection
          navigate('/');
        } else if (storeAssignments.length === 1) {
          // Only one company — auto-select it
          useAuthStore.getState().setCurrentCompany(storeAssignments[0].companyId);
          navigate('/');
        } else if (storeAssignments.length > 1) {
          // Multiple companies — show selector
          setAssignments(storeAssignments);
          setStep('company-select');
        } else {
          // No assignments and not super admin — allow login but no company context
          navigate('/');
        }
      }
    } catch (err: any) {
      const graphQLError = err.graphQLErrors?.[0];
      if (graphQLError?.extensions?.code) {
        const errorCode = graphQLError.extensions.code;
        switch (errorCode) {
          case 'EMAIL_NOT_FOUND':
            setError(t('auth.error.emailNotFound', { default: 'The email address you entered does not exist in our system. Please check your email or register for a new account.' }));
            break;
          case 'INVALID_PASSWORD':
            setError(t('auth.error.invalidPassword', { default: 'The password you entered is incorrect. Please try again or reset your password.' }));
            break;
          case 'ACCOUNT_INACTIVE':
            setError(t('auth.error.accountInactive', { default: 'Your account has been deactivated. Please contact support for assistance.' }));
            break;
          case 'EMAIL_NOT_VERIFIED':
            setError(t('auth.error.emailNotVerified', { default: 'Please verify your email address before logging in. Check your inbox for a verification link.' }));
            break;
          default:
            setError(t('auth.loginError', { default: 'Login failed. Please check your credentials.' }));
        }
      } else {
        setError(err.message || t('auth.loginError', { default: 'Login failed. Please check your credentials.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (companyId: string) => {
    useAuthStore.getState().setCurrentCompany(companyId);
    navigate('/');
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      USER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[role] || colors.USER;
  };

  if (step === 'company-select') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            {t('auth.selectCompany', { default: 'Select Company' })}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.selectCompanyHint', { default: 'Choose the company you want to work with' })}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          {assignments.map((assignment) => (
            <button
              key={assignment.companyId}
              onClick={() => handleCompanySelect(assignment.companyId)}
              className="w-full flex items-center gap-4 rounded-lg border border-gray-300 dark:border-gray-600 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {assignment.companyName}
                </p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold mt-1 ${getRoleBadge(assignment.role)}`}>
                  {assignment.role}
                </span>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            useAuthStore.getState().logout();
            setStep('credentials');
            setAssignments([]);
          }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {t('auth.backToLogin', { default: 'Back to Login' })}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.auth.signIn', { default: 'Sign In' })}
        </h2>
      </div>

      <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.auth.email', { default: 'Email' })}
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              placeholder=""
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.auth.password', { default: 'Password' })}
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm pr-10"
              placeholder=""
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              {t('auth.auth.rememberMe', { default: 'Remember me' })}
            </label>
          </div>

          <div className="text-sm">
            <Link
              to="/auth/forgot-password"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {t('auth.auth.forgotPassword', { default: 'Forgot password?' })}
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {t('auth.auth.loginButton', { default: 'Sign In' })}
          </button>
        </div>
      </form>
    </div>
  );
}
