import { useI18n } from '../providers/I18nProvider';
import { useAuthStore } from '../stores/authStore';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const stats = [
  { labelKey: 'dashboard.totalCompanies', value: '12', icon: BuildingOfficeIcon },
  { labelKey: 'dashboard.totalUsers', value: '156', icon: UsersIcon },
  { labelKey: 'dashboard.revenue', value: '$45,231', icon: CurrencyDollarIcon },
  { labelKey: 'dashboard.growth', value: '+12.5%', icon: ChartBarIcon },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);

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
