import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../providers/I18nProvider';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        firstName
        lastName
        preferredLanguage
      }
      accessToken
      refreshToken
    }
  }
`;

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { user, accessToken, refreshToken } = data.login;
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    },
    onError: (err) => {
      setError(err.message || t('auth.loginError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    login({ variables: { email, password } });
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-center">
        {t('auth.signIn')}
      </h2>

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
            placeholder="admin@erp-system.local"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label mb-1">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('auth.signIn')}
        </button>

        <div className="text-center">
          <Link
            to="/auth/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>{t('auth.demoCredentials')}:</p>
        <p className="font-mono">admin@erp-system.local / Admin123!</p>
      </div>
    </div>
  );
}
