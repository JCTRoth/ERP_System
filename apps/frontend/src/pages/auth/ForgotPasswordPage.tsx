import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../providers/I18nProvider';
import { authService } from '../../services/authService';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.requestPasswordReset(email);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || t('auth.resetError'));
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
        <h2 className="mb-4 text-xl font-semibold">{t('auth.resetEmailSent')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('auth.resetEmailSentDescription')}
        </p>
        <Link
          to="/auth/login"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold text-center">
        {t('auth.forgotPassword')}
      </h2>
      <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
        {t('auth.forgotPasswordDescription')}
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label mb-1">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('auth.sendResetLink')}
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
