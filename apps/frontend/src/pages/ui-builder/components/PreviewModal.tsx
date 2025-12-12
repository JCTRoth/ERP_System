import { XMarkIcon } from '@heroicons/react/24/outline';
import { UIComponent } from '../types';
import ComponentRenderer from './ComponentRenderer';
import { useI18n } from '../../../providers/I18nProvider';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: UIComponent[];
  pageName?: string;
}

export default function PreviewModal({ isOpen, onClose, components, pageName }: PreviewModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">
              {t('uiBuilder.preview')}: {pageName || t('uiBuilder.untitled')}
            </h2>
            <p className="text-sm text-gray-500">{t('uiBuilder.previewDescription')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {components.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {t('uiBuilder.noComponents')}
              </div>
            ) : (
              <div className="space-y-4">
                {components.map((component) => (
                  <ComponentRenderer key={component.id} component={component} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
