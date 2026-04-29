import { useParams } from 'react-router-dom';
import { useUIBuilderStore } from '../../stores/uiBuilderStore';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../providers/I18nProvider';
import { UIComponent, AccessControl } from '../ui-builder/types';
import ComponentRenderer from '../ui-builder/components/ComponentRenderer';

/**
 * Check if the current user has access based on an AccessControl config.
 * Returns true if access is granted.
 */
function checkAccess(
  access: AccessControl | undefined,
  companyRole: string | null,
  permissionCodes: string[],
  isGlobalSuperAdmin: boolean,
): boolean {
  if (!access || access.mode === 'public') return true;
  if (isGlobalSuperAdmin) return true;

  const hasRole =
    !access.requiredRoles?.length ||
    access.requiredRoles.some((r) => r === companyRole);

  const hasPerm =
    !access.requiredPermissions?.length ||
    access.requiredPermissions.some((p) => permissionCodes.includes(p));

  // User needs to match at least one of the configured lists
  // If both roles and permissions are set, user needs to satisfy at least one
  if (access.requiredRoles?.length && access.requiredPermissions?.length) {
    return hasRole || hasPerm;
  }
  return hasRole && hasPerm;
}

export default function CustomPageDisplay() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const pages = useUIBuilderStore((state) => state.pages);
  const companyRole = useAuthStore((state) => state.companyRole);
  const permissionCodes = useAuthStore((state) => state.permissionCodes);
  const isGlobalSuperAdmin = useAuthStore((state) => state.isGlobalSuperAdmin);

  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('customPage.notFound')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('customPage.notFoundDescription')}
          </p>
        </div>
      </div>
    );
  }

  // Page-level access check
  if (!checkAccess(page.access, companyRole, permissionCodes, isGlobalSuperAdmin)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('common.accessDenied') || 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('common.accessDeniedDescription') || 'You do not have permission to view this page.'}
          </p>
        </div>
      </div>
    );
  }

  const renderComponent = (component: UIComponent) => {
    const hasAccess = checkAccess(component.access, companyRole, permissionCodes, isGlobalSuperAdmin);

    if (!hasAccess) {
      // Hidden mode: don't render at all
      if (component.access?.hideWhenRestricted !== false) {
        return null;
      }
      // Disabled mode: render with disabled overlay
      return (
        <div key={component.id} className="mb-4 pointer-events-none opacity-40">
          <ComponentRenderer component={component} />
        </div>
      );
    }

    return (
      <div key={component.id} className="mb-4">
        <ComponentRenderer component={component} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{page.name}</h1>
        {page.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {page.description}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto card p-6">
        {page.components.map((component: UIComponent) => renderComponent(component))}
      </div>
    </div>
  );
}