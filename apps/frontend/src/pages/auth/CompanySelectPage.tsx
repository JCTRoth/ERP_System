import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useAuthStore } from '../../stores/authStore';

export default function CompanySelectPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const logout = useAuthStore((state) => state.logout);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
      return;
    }
    // If company already selected, go to dashboard
    if (currentCompanyId) {
      navigate('/', { replace: true });
      return;
    }
    // If only one company, auto-select and go to dashboard
    if (companyAssignments.length === 1) {
      useAuthStore.getState().setCurrentCompany(companyAssignments[0].companyId);
      navigate('/', { replace: true });
      return;
    }
    // No assignments (super admin or no companies) — go to dashboard
    if (companyAssignments.length === 0) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, currentCompanyId, companyAssignments, navigate]);

  const handleCompanySelect = (companyId: string) => {
    useAuthStore.getState().setCurrentCompany(companyId);
    navigate('/');
  };

  const handleBack = () => {
    logout();
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

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {companyAssignments.map((assignment) => (
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
              onClick={handleBack}
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
