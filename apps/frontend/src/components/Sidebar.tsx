import { NavLink } from 'react-router-dom';
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
  const hasPermission = useAuthStore((state) => state.hasPermission);

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

      {/* User Info */}
      <div className="mt-auto border-t border-gray-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="text-sm">
            <p className="font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-bodydark">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
