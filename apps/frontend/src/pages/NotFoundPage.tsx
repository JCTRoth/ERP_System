import { Link } from 'react-router-dom';
import { useI18n } from '../providers/I18nProvider';

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <p className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
          {t('errors.pageNotFound')}
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('errors.pageNotFoundDesc')}
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-block"
        >
          {t('common.backToHome')}
        </Link>
      </div>
    </div>
  );
}
