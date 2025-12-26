import { useEffect } from 'react';
import { useI18n } from '../providers/I18nProvider';
import { useAuthStore } from '../stores/authStore';
import { useQuery, gql } from '@apollo/client';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const GET_TOTAL_COMPANIES = gql`
  query GetTotalCompanies {
    totalCompanies
  }
`;

const GET_COMPANIES_LIST = gql`
  query GetCompaniesList {
    companies {
      id
    }
  }
`;

const GET_TOTAL_USERS = gql`
  query GetTotalUsers {
    totalUsers
  }
`;

export default function DashboardPage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);

  // Fetch real metrics with error handling and fallback
  const { data: companiesData, loading: companiesLoading, error: companiesError } = useQuery(GET_TOTAL_COMPANIES);

  useEffect(() => {
    if (companiesData) {
      console.log('Companies count loaded:', companiesData);
    }
  }, [companiesData]);

  useEffect(() => {
    if (companiesError) {
      console.error('Error loading companies count:', companiesError);
    }
  }, [companiesError]);

  // Fallback: use companies list if count query fails
  const { data: companiesListData, loading: companiesListLoading, error: companiesListError } = useQuery(GET_COMPANIES_LIST, {
    skip: !companiesError, // Only run if the count query fails
  });

  useEffect(() => {
    if (companiesListData) {
      console.log('Companies list loaded (fallback):', companiesListData);
    }
  }, [companiesListData]);

  useEffect(() => {
    if (companiesListError) {
      console.error('Error loading companies list:', companiesListError);
    }
  }, [companiesListError]);
  
  const { data: usersData, loading: usersLoading, error: usersError } = useQuery(GET_TOTAL_USERS);

  useEffect(() => {
    if (usersData) {
      console.log('Users data loaded:', usersData);
    }
  }, [usersData]);

  useEffect(() => {
    if (usersError) {
      console.error('Error loading users:', usersError);
    }
  }, [usersError]);

  // Prepare stats with real data and better error handling with fallback
  const stats = [
    {
      labelKey: 'dashboard.totalCompanies',
      value: companiesLoading ? '...' : 
             companiesError ? 
               (companiesListLoading ? '...' : (companiesListData?.companies?.length?.toString() || t('dashboard.serviceUnavailable'))) :
               (companiesData?.totalCompanies?.toString() || '0'),
      icon: BuildingOfficeIcon
    },
    {
      labelKey: 'dashboard.totalUsers',
      value: usersLoading ? '...' : usersError ? t('dashboard.serviceUnavailable') : (usersData?.totalUsers?.toString() || '0'),
      icon: UsersIcon
    },
    {
      labelKey: 'dashboard.revenue',
      value: '$45,231',
      icon: CurrencyDollarIcon
    },
    {
      labelKey: 'dashboard.growth',
      value: '+12.5%',
      icon: ChartBarIcon
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {t('dashboard.welcome', { name: user?.firstName || '' })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard.overview')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.labelKey} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t(stat.labelKey)}
                </p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="rounded-full bg-primary-100 p-3 dark:bg-primary-900/30">
                <stat.icon className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="font-semibold">{t('dashboard.recentUsers')}</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 dark:text-gray-400">
              {t('dashboard.noRecentActivity')}
            </p>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="font-semibold">{t('dashboard.recentOrders')}</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 dark:text-gray-400">
              {t('dashboard.noRecentActivity')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
