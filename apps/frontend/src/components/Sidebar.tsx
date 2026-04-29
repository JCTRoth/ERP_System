import { NavLink, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  LanguageIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
  ChevronLeftIcon,
  CubeIcon,
  ShoppingCartIcon,
  CalculatorIcon,
  CircleStackIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../stores/uiStore';
import { useI18n } from '../providers/I18nProvider';
import { useAuthStore } from '../stores/authStore';
import CustomPagesSection from './CustomPagesSection';

interface MenuItem {
  path: string;
  icon: typeof HomeIcon;
  labelKey: string;
  tooltipKey: string;
  permission?: string;
  requiresCompany?: boolean;
}

const menuItems: MenuItem[] = [
  { path: '/', icon: HomeIcon, labelKey: 'nav.dashboard', tooltipKey: 'nav.dashboardTooltip' },
  { path: '/products', icon: CubeIcon, labelKey: 'nav.products', tooltipKey: 'nav.productsTooltip', permission: 'shop.product.read', requiresCompany: true },
  { path: '/orders', icon: ShoppingCartIcon, labelKey: 'nav.orders', tooltipKey: 'nav.ordersTooltip', permission: 'orders.order.read', requiresCompany: true },
  { path: '/accounting', icon: CalculatorIcon, labelKey: 'nav.accounting', tooltipKey: 'nav.accountingTooltip', permission: 'accounting.record.read', requiresCompany: true },
  { path: '/masterdata', icon: CircleStackIcon, labelKey: 'nav.masterdata', tooltipKey: 'nav.masterdataTooltip', permission: 'masterdata.record.read', requiresCompany: true },
  { path: '/templates', icon: DocumentTextIcon, labelKey: 'nav.templates', tooltipKey: 'nav.templatesTooltip', permission: 'template.template.read', requiresCompany: true },
  { path: '/translations', icon: LanguageIcon, labelKey: 'nav.translations', tooltipKey: 'nav.translationsTooltip', permission: 'translation.translation.read', requiresCompany: true },
  { path: '/ui-builder', icon: RectangleStackIcon, labelKey: 'nav.uiBuilder', tooltipKey: 'nav.uiBuilderTooltip', permission: 'scripting.script.read', requiresCompany: true },
  { path: '/companies', icon: BuildingOfficeIcon, labelKey: 'nav.companies', tooltipKey: 'nav.companiesTooltip', permission: 'company.company.read' },
  { path: '/users', icon: UsersIcon, labelKey: 'nav.users', tooltipKey: 'nav.usersTooltip', permission: 'user.user.read' },
  { path: '/settings', icon: Cog6ToothIcon, labelKey: 'nav.settings', tooltipKey: 'nav.settingsTooltip' },
];

export default function Sidebar() {
  const { t } = useI18n();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const currentCompanyName = useAuthStore((state) => state.currentCompanyName);
  const companyRole = useAuthStore((state) => state.companyRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getTooltipPosition = () => {
    if (!buttonRef.current) return { bottom: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
    };
  };

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresCompany && !currentCompanyId) {
      return false;
    }

    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    return true;
  });

  return (
    <>
    <aside
      className={`absolute left-0 top-0 z-30 flex h-screen w-64 flex-col overflow-y-hidden bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5">
        <NavLink to="/" className="text-xl font-bold text-white">
          ERP System
        </NavLink>
        <button
          onClick={toggleSidebar}
          className="text-bodydark hover:text-white lg:hidden"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex flex-col overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-1">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link'
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Custom Pages */}
      <CustomPagesSection />

      <div className="mt-auto border-t border-gray-700 px-4 py-4">
        <button
          ref={buttonRef}
          onClick={() => navigate('/settings?tab=account')}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={t('nav.userProfile')}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-bodydark">{user?.email}</p>
          </div>
        </button>
      </div>
    </aside>

      {/* Hover Tooltip - portalled to body to avoid sidebar overflow clipping */}
      {showTooltip && createPortal(
        <div
          className="fixed z-[9999] w-72 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl"
          style={{ bottom: getTooltipPosition().bottom, left: getTooltipPosition().left }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="mb-2 border-b border-gray-600 pb-2">
            <p className="font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          {user?.role && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{t('nav.userTooltipRole')}</span>
              <span className="rounded bg-primary-600/20 px-1.5 py-0.5 text-primary-400">{user.role}</span>
            </div>
          )}
          {currentCompanyName && (
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">{t('nav.userTooltipCompany')}</span>
              <span className="truncate pl-2 text-gray-200">{currentCompanyName}</span>
            </div>
          )}
          {companyRole && (
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">{t('nav.userTooltipCompanyRole')}</span>
              <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-blue-400">{companyRole}</span>
            </div>
          )}
          <div className="mt-2 border-t border-gray-600 pt-2 text-xs text-gray-500">
            {t('nav.userTooltipClickHint')}
          </div>
          <div className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 border-b border-r border-gray-600 bg-gray-800" />
        </div>,
        document.body
      )}
    </>
  );
}
