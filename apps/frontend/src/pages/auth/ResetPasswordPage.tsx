import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../providers/I18nProvider';
import { authService } from '../../services/authService';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const ok = await authService.resetPassword(token!, password);
      if (ok) {
        setSuccess(true);
      } else {
        setError(t('auth.resetError'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.resetError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-4 rounded-full mx-auto w-16 h-16 bg-green-100 flex items-center justify-center dark:bg-green-900/30">
          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-4 text-xl font-semibold">{t('auth.passwordResetSuccess')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('auth.passwordResetSuccessDescription')}
        </p>
        <Link
          to="/auth/login"
          className="btn-primary inline-block"
        >
          {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold text-center">
        {t('auth.resetPassword')}
      </h2>
      <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
        {t('auth.resetPasswordDescription')}
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="label mb-1">
            {t('auth.newPassword')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label mb-1">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('auth.resetPassword')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/auth/login"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
