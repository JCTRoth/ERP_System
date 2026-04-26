import { useEffect, useState } from "react";
import { useI18n } from "../providers/I18nProvider";
import { useAuthStore } from "../stores/authStore";
import { useQuery, gql } from "@apollo/client";
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

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

const GET_CURRENT_COMPANY = gql`
  query GetCurrentCompany($id: ID!) {
    company(id: $id) {
      id
      name
      slug
      description
      logoUrl
      settingsJson
      isActive
    }
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
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const currentAssignment = companyAssignments.find(a => a.companyId === currentCompanyId);
  const canReadCompanies = hasPermission('company.company.read');
  const canReadUsers = hasPermission('user.user.read');
  const canReadCustomers = Boolean(currentCompanyId) && hasPermission('masterdata.record.read');
  const canReadOrders = Boolean(currentCompanyId) && hasPermission('orders.order.read');

  // Local UI state for sorting
  const [customerSort, setCustomerSort] = useState<"name-asc" | "name-desc">(
    "name-asc"
  );
  const [orderSort, setOrderSort] = useState<
    "date-desc" | "date-asc" | "total-desc" | "total-asc"
  >("date-desc");

  // Fetch real metrics with error handling and fallback
  const {
    data: companiesData,
    loading: companiesLoading,
    error: companiesError,
  } = useQuery(GET_TOTAL_COMPANIES, {
    skip: !canReadCompanies,
  });

  useEffect(() => {
    if (companiesData) {
      console.log("Companies count loaded:", companiesData);
    }
  }, [companiesData]);

  useEffect(() => {
    if (companiesError) {
      console.error("Error loading companies count:", companiesError);
    }
  }, [companiesError]);

  // Fallback: use companies list if count query fails
  const {
    data: companiesListData,
    loading: companiesListLoading,
    error: companiesListError,
  } = useQuery(GET_COMPANIES_LIST, {
    skip: !canReadCompanies || !companiesError,
  });

  useEffect(() => {
    if (companiesListData) {
      console.log("Companies list loaded (fallback):", companiesListData);
    }
  }, [companiesListData]);

  useEffect(() => {
    if (companiesListError) {
      console.error("Error loading companies list:", companiesListError);
    }
  }, [companiesListError]);

  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery(GET_TOTAL_USERS, {
    skip: !canReadUsers,
  });

  useEffect(() => {
    if (usersData) {
      console.log("Users data loaded:", usersData);
    }
  }, [usersData]);

  useEffect(() => {
    if (usersError) {
      console.error("Error loading users:", usersError);
    }
  }, [usersError]);

  // Fetch recent customers
  const {
    data: customersData,
    loading: customersLoading,
    error: customersError,
  } = useQuery(GET_RECENT_CUSTOMERS, {
    variables: { first: 20 },
    errorPolicy: "all",
    skip: !canReadCustomers,
  });

  // Fetch recent orders
  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
  } = useQuery(GET_RECENT_ORDERS, {
    variables: { first: 20 },
    errorPolicy: "all",
    skip: !canReadOrders,
  });

  // Fetch current company details
  const {
    data: companyData,
    loading: companyLoading,
  } = useQuery(GET_CURRENT_COMPANY, {
    variables: { id: currentCompanyId },
    skip: !currentCompanyId || !canReadCompanies,
    errorPolicy: "all",
  });

  const currentCompany = companyData?.company;
  const companySettings = currentCompany?.settingsJson || {};
  const companyName = currentCompany?.name || currentAssignment?.companyName || t('dashboard.company', { default: 'Company' });
  const companyDescription = currentCompany?.description || '';
  const companySlogan = (companySettings as Record<string, unknown>)?.tagline as string || '';
  const companyLogoUrl = currentCompany?.logoUrl;

  // Check if user is authenticated
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Prepare stats with real data and better error handling with fallback
  const stats = [
    {
      labelKey: "dashboard.totalCompanies",
      value: !canReadCompanies
        ? "-"
        : companiesLoading
        ? "..."
        : companiesError
          ? companiesListLoading
            ? "..."
            : companiesListError
              ? t("dashboard.serviceUnavailable")
              : companiesListData?.companies?.length?.toString() || "0"
          : companiesData?.totalCompanies?.toString() || "0",
      icon: BuildingOfficeIcon,
    },
    {
      labelKey: "dashboard.totalUsers",
      value: !canReadUsers
        ? "-"
        : usersLoading
        ? "..."
        : usersError
          ? t("dashboard.serviceUnavailable")
          : usersData?.totalUsers?.toString() || "0",
      icon: UsersIcon,
    },
    {
      labelKey: "dashboard.revenue",
      value: "$45,231",
      icon: CurrencyDollarIcon,
    },
    {
      labelKey: "dashboard.growth",
      value: "+12.5%",
      icon: ChartBarIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          {t("dashboard.welcome", { name: user?.firstName || "" })}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {t("dashboard.overview")}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-100 p-3 dark:border-yellow-900/50 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t("dashboard.notAuthenticatedHint")}
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.labelKey}
            className="card p-6 transition-shadow hover:shadow-lg"
          >
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

      {/* Company Section - Dynamic per-tenant */}
      {currentCompanyId && (
      <div className="card overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-white p-2 shadow-md">
                {companyLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  </div>
                ) : companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt={`${companyName} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded bg-gradient-to-br from-blue-100 to-blue-200">
                    <span className="text-3xl font-bold text-blue-600">
                      {companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold">{companyName}</h2>
              {companySlogan && (
                <p className="mt-2 text-lg font-semibold text-blue-100">
                  {companySlogan}
                </p>
              )}
              {companyDescription && (
                <p className="mt-3 text-sm leading-relaxed text-blue-50">
                  {companyDescription}
                </p>
              )}
              {currentAssignment?.role && (
                <p className="mt-2 text-xs text-blue-200">
                  {t('dashboard.yourRole', { default: 'Your role' })}: <span className="font-semibold capitalize">{currentAssignment.role}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Company Stats from settingsJson */}
        {companySettings && typeof companySettings === 'object' && Array.isArray((companySettings as Record<string, unknown>).stats) && (
        <div className="grid grid-cols-3 gap-4 border-t border-gray-200 px-6 py-6 dark:border-gray-700 sm:grid-cols-4">
          {((companySettings as Record<string, unknown>).stats as Array<{value: string; label: string}>).slice(0, 4).map((stat, idx) => (
            <div key={idx} className={`text-center${idx === 3 ? ' hidden sm:block' : ''}`}>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {stat.value}
              </div>
              <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <div className="card shadow-lg">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <UsersIcon className="h-5 w-5 text-primary-600" />
                {t("dashboard.recentCustomers")}
              </h2>
              <div className="flex items-center gap-2">
                <ChevronUpDownIcon className="h-4 w-4 text-gray-500" />
                <label className="sr-only">Sort customers</label>
                <select
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  value={customerSort}
                  onChange={(e) => setCustomerSort(e.target.value as any)}
                >
                  <option value="name-asc">Name ↑</option>
                  <option value="name-desc">Name ↓</option>
                </select>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {customersLoading ? (
              <div className="p-6 text-center text-gray-500">
                {t("common.loading")}
              </div>
            ) : customersError ? (
              <div className="p-6 text-center text-gray-500">
                {t("dashboard.noRecentActivity")}
              </div>
            ) : customersData?.customers?.nodes?.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const nodes = customersData?.customers?.nodes || [];
                  const sorted = [...nodes].sort((a: any, b: any) => {
                    const an = (a.name || "").toLowerCase();
                    const bn = (b.name || "").toLowerCase();
                    return customerSort === "name-asc"
                      ? an.localeCompare(bn)
                      : bn.localeCompare(an);
                  });
                  return sorted.map((customer: any) => (
                  <li
                    key={customer.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
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
                ));
                })()}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t("dashboard.noRecentActivity")}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card shadow-lg">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                {t("dashboard.recentOrders")}
              </h2>
              <div className="flex items-center gap-2">
                <ChevronUpDownIcon className="h-4 w-4 text-gray-500" />
                <label className="sr-only">Sort orders</label>
                <select
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
                  value={orderSort}
                  onChange={(e) => setOrderSort(e.target.value as any)}
                >
                  <option value="date-desc">Newest</option>
                  <option value="date-asc">Oldest</option>
                  <option value="total-desc">Total ↓</option>
                  <option value="total-asc">Total ↑</option>
                </select>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {ordersLoading ? (
              <div className="p-6 text-center text-gray-500">
                {t("common.loading")}
              </div>
            ) : ordersError ? (
              <div className="p-6 text-center text-gray-500">
                {t("dashboard.noRecentActivity")}
              </div>
            ) : ordersData?.shopOrders?.nodes?.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const nodes = ordersData?.shopOrders?.nodes || [];
                  const sorted = [...nodes].sort((a: any, b: any) => {
                    if (orderSort.startsWith("date")) {
                      const ad = new Date(a.createdAt).getTime();
                      const bd = new Date(b.createdAt).getTime();
                      return orderSort === "date-desc" ? bd - ad : ad - bd;
                    }
                    if (orderSort.startsWith("total")) {
                      const at = Number(a.total || 0);
                      const bt = Number(b.total || 0);
                      return orderSort === "total-desc" ? bt - at : at - bt;
                    }
                    return 0;
                  });
                  return sorted.map((order: any) => (
                  <li
                    key={order.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              order.status === "DELIVERED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : order.status === "SHIPPED"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : order.status === "CONFIRMED"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
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
                ));
                })()}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t("dashboard.noRecentActivity")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
