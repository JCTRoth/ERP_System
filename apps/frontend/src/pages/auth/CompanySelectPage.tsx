import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';

export default function CompanySelectPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const isGlobalSuperAdmin = useAuthStore((state) => state.isGlobalSuperAdmin);
  const [selectingCompanyId, setSelectingCompanyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // If not authenticated, redirect to login
  useEffect(() => {
    let cancelled = false;

    const autoSelectSingleCompany = async () => {
      if (companyAssignments.length !== 1) {
        return;
      }

      try {
        setSelectingCompanyId(companyAssignments[0].companyId);
        await authService.switchCompany(companyAssignments[0].companyId);
        if (!cancelled) {
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || t('auth.selectCompanyError', { default: 'Could not switch company.' }));
          setSelectingCompanyId(null);
        }
      }
    };

    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
    } else if (currentCompanyId) {
      navigate('/', { replace: true });
    } else if (companyAssignments.length === 1) {
      void autoSelectSingleCompany();
    } else if (companyAssignments.length === 0 && isGlobalSuperAdmin) {
      navigate('/', { replace: true });
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentCompanyId, companyAssignments, isGlobalSuperAdmin, navigate, t]);

  const handleCompanySelect = async (companyId: string) => {
    try {
      setError('');
      setSelectingCompanyId(companyId);
      await authService.switchCompany(companyId);
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('auth.selectCompanyError', { default: 'Could not switch company.' }));
      setSelectingCompanyId(null);
    }
  };

  const handleBack = async () => {
    await authService.logout();
    navigate('/auth/login', { replace: true });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600">ERP System</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enterprise Resource Planning
          </p>
        </div>
        <div className="card p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                {t('auth.selectCompany', { default: 'Select Company' })}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {t('auth.selectCompanyHint', { default: 'Choose the company you want to work with' })}
              </p>
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {companyAssignments.map((assignment) => (
                <button
                  key={assignment.companyId}
                  onClick={() => void handleCompanySelect(assignment.companyId)}
                  disabled={Boolean(selectingCompanyId)}
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
                  {selectingCompanyId === assignment.companyId ? (
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                      {t('common.loading', { default: 'Loading...' })}
                    </span>
                  ) : null}
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>

            <button
              onClick={() => void handleBack()}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('auth.backToLogin', { default: 'Back to Login' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
