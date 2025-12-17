import { NavLink } from 'react-router-dom';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../providers/I18nProvider';
import { useUIBuilderStore } from '../stores/uiBuilderStore';

export default function CustomPagesSection() {
  const { t } = useI18n();
  const pages = useUIBuilderStore((state) => state.pages);

  if (pages.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2">
      <div className="mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {t('nav.customPages')}
      </div>
      <nav className="flex flex-col gap-1">
        <ul className="flex flex-col gap-1">
          {pages.map((page) => (
            <li key={page.id}>
              <NavLink
                to={`/custom-page/${page.slug}`}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link'
                }
              >
                <DocumentIcon className="h-5 w-5" />
                <span>{page.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}