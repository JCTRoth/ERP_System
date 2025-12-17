import { useParams } from 'react-router-dom';
import { useUIBuilderStore } from '../../stores/uiBuilderStore';
import { useI18n } from '../../providers/I18nProvider';
import { UIComponent } from '../ui-builder/types';
import ComponentRenderer from '../ui-builder/components/ComponentRenderer';

export default function CustomPageDisplay() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const pages = useUIBuilderStore((state) => state.pages);

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
        {page.components.map((component: UIComponent) => (
          <div key={component.id} className="mb-4">
            <ComponentRenderer component={component} />
          </div>
        ))}
      </div>
    </div>
  );
}