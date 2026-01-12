import { useEffect } from 'react';
import { useI18n } from '../providers/I18nProvider';
import { useAuthStore } from '../stores/authStore';
import { useQuery, gql } from '@apollo/client';
import { shopApolloClient } from '../lib/apollo';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  EnvelopeIcon,
  CheckCircleIcon,
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

const GET_RECENT_CUSTOMERS = gql`
  query GetRecentCustomers($first: Int!) {
    customers(first: $first) {
      nodes {
        id
        name
        email
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const GET_RECENT_ORDERS = gql`
  query GetRecentOrders($first: Int!) {
    shopOrders(first: $first, order: { createdAt: DESC }) {
      nodes {
        id
        orderNumber
        customer {
          id
          firstName
          lastName
          email
        }
        status
        total
        createdAt
      }
      pageInfo {
        hasNextPage
      }
    }
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

  // Fetch recent customers
  const { data: customersData, loading: customersLoading, error: customersError } = useQuery(GET_RECENT_CUSTOMERS, {
    variables: { first: 20 },
    errorPolicy: 'all',
  });

  // Fetch recent orders
  const { data: ordersData, loading: ordersLoading, error: ordersError } = useQuery(GET_RECENT_ORDERS, {
    variables: { first: 20 },
    errorPolicy: 'all',
    client: shopApolloClient,
  });

  // Check if user is authenticated
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Prepare stats with real data and better error handling with fallback
  const stats = [
    {
      labelKey: 'dashboard.totalCompanies',
      value: companiesLoading ? '...' : 
             companiesError ? 
               (companiesListLoading ? '...' : 
                (companiesListError ? t('dashboard.serviceUnavailable') : 
                 (companiesListData?.companies?.length?.toString() || '0'))) :
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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome', { name: user?.firstName || '' })}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {t('dashboard.overview')}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-100 p-3 dark:border-yellow-900/50 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('dashboard.notAuthenticatedHint')}
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.labelKey} className="card p-6 transition-shadow hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t(stat.labelKey)}
                </p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900/30">
                <stat.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Company Section - MediVita */}
      <div className="card overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-white p-2 shadow-md">
                <svg
                  className="h-full w-full"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Medical/Pharmaceutical logo with pill and heart */}
                  <defs>
                    <linearGradient id="pillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#1e40af', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  {/* Background */}
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Pill shape */}
                  <g transform="translate(50, 35)">
                    <circle cx="-12" cy="0" r="10" fill="url(#pillGradient)" />
                    <rect x="-2" y="-10" width="4" height="20" fill="url(#pillGradient)" />
                    <circle cx="12" cy="0" r="10" fill="#ef4444" />
                  </g>
                  {/* Heart shape */}
                  <g transform="translate(50, 65)">
                    <path
                      d="M 0,-8 C -8,-16 -16,-16 -16,-6 C -16,0 -8,8 0,16 C 8,8 16,0 16,-6 C 16,-16 8,-16 0,-8 Z"
                      fill="#10b981"
                    />
                  </g>
                </svg>
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold">MediVita</h2>
              <p className="mt-2 text-lg font-semibold text-blue-100">
                Crafting Health for Life
              </p>
              <p className="mt-3 text-sm leading-relaxed text-blue-50">
                We specialize in innovative pharmaceuticals, blending advanced science with a passion for well-being. Our mission: to deliver trusted, effective solutions for a healthier world.
              </p>
            </div>
          </div>
        </div>

        {/* Company Stats */}
        <div className="grid grid-cols-3 gap-4 border-t border-gray-200 px-6 py-6 dark:border-gray-700 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">98%</div>
            <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">Customer Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">50+</div>
            <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">125+</div>
            <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">Countries</div>
          </div>
          <div className="hidden text-center sm:block">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">20+</div>
            <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">Years</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <div className="card shadow-lg">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="flex items-center gap-2 font-semibold">
              <UsersIcon className="h-5 w-5 text-primary-600" />
              {t('dashboard.recentCustomers')}
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {customersLoading ? (
              <div className="p-6 text-center text-gray-500">
                {t('common.loading')}
              </div>
            ) : customersError ? (
              <div className="p-6 text-center text-gray-500">
                {t('dashboard.noRecentActivity')}
              </div>
            ) : customersData?.customers?.nodes?.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {customersData.customers.nodes.map((customer: any) => (
                  <li key={customer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <EnvelopeIcon className="h-4 w-4" />
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t('dashboard.noRecentActivity')}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card shadow-lg">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="flex items-center gap-2 font-semibold">
              <CheckCircleIcon className="h-5 w-5 text-primary-600" />
              {t('dashboard.recentOrders')}
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {ordersLoading ? (
              <div className="p-6 text-center text-gray-500">
                {t('common.loading')}
              </div>
            ) : ordersError ? (
              <div className="p-6 text-center text-gray-500">
                {t('dashboard.noRecentActivity')}
              </div>
            ) : ordersData?.shopOrders?.nodes?.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {ordersData.shopOrders.nodes.map((order: any) => (
                  <li key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            order.status === 'CONFIRMED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            ${(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t('dashboard.noRecentActivity')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
