import { NavLink } from 'react-router-dom';
import { DocumentIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../providers/I18nProvider';
import { useUIBuilderStore } from '../stores/uiBuilderStore';
import { useAuthStore } from '../stores/authStore';

export default function CustomPagesSection() {
  const { t } = useI18n();
  const pages = useUIBuilderStore((state) => state.pages);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const companyRole = useAuthStore((state) => state.companyRole);
  const permissionCodes = useAuthStore((state) => state.permissionCodes);
  const groupCodes = useAuthStore((state) => state.groupCodes);
  const isGlobalSuperAdmin = useAuthStore((state) => state.isGlobalSuperAdmin);

  if (pages.length === 0 || !currentCompanyId || !hasPermission('scripting.script.read')) {
    return null;
  }

  // Filter pages by access control
  const visiblePages = pages.filter((page) => {
    if (!page.access || page.access.mode === 'public') return true;
    if (isGlobalSuperAdmin) return true;

    const hasRole =
      !page.access.requiredRoles?.length ||
      page.access.requiredRoles.some((r) => r === companyRole);

    const hasPerm =
      !page.access.requiredPermissions?.length ||
      page.access.requiredPermissions.some((p) => permissionCodes.includes(p));

    const hasGroup =
      !page.access.requiredGroups?.length ||
      page.access.requiredGroups.some((g) => groupCodes.includes(g));

    const checks: boolean[] = [];
    if (page.access.requiredRoles?.length) checks.push(hasRole);
    if (page.access.requiredPermissions?.length) checks.push(hasPerm);
    if (page.access.requiredGroups?.length) checks.push(hasGroup);

    if (checks.length === 0) return true;
    return checks.some(Boolean);
  });

  if (visiblePages.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {t('nav.customPages')}
      </div>
      <nav className="flex flex-col gap-1">
        <ul className="flex flex-col gap-1">
          {visiblePages.map((page) => (
            <li key={page.id}>
              <NavLink
                to={`/custom-page/${page.slug}`}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link'
                }
              >
                <DocumentIcon className="h-5 w-5" />
                <span>{page.name}</span>
                {page.access?.mode === 'restricted' && (
                  <ShieldCheckIcon className="ml-auto h-3.5 w-3.5 text-amber-500" title="Restricted access" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
