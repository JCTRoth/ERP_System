import { useState, useEffect } from 'react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
// import Editor from '@monaco-editor/react'; // Temporarily disabled due to installation issues
import { useI18n } from '../../providers/I18nProvider';
import TemplateVariablesPanel from './TemplateVariablesPanel';
import * as templatesApi from '../../lib/api/templates';

interface Template {
  id: string;
  key: string;
  name: string;
  content: string;
  language: string;
  documentType: string;
  assignedState?: string;
  companyId: string;
}

interface TemplateEditorModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function TemplateEditorModal({
  template,
  onClose,
  onSave,
}: TemplateEditorModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    content: '',
    language: 'en',
    documentType: 'invoice',
    assignedState: '',
  });
  const [saving, setSaving] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        key: template.key,
        content: template.content,
        language: template.language,
        documentType: template.documentType,
        assignedState: template.assignedState || '',
      });
    }
  }, [template]);

  // Load available variables
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        const vars = await templatesApi.getAvailableVariables();
        setVariables(vars);
      } catch (err) {
        console.error('Failed to load variables:', err);
      } finally {
        setLoading(false);
      }
    };
    loadVariables();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFormData((prev) => ({ ...prev, content: value }));
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.key || !formData.content) {
      alert(t('common.error'));
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
    } catch (err) {
      console.error('Failed to save template:', err);
      alert(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const documentTypeOptions = [
    { value: 'invoice', label: t('templates.documentType.invoice') },
    { value: 'deliveryNote', label: t('templates.documentType.deliveryNote') },
    { value: 'quotation', label: t('templates.documentType.quotation') },
    { value: 'purchaseOrder', label: t('templates.documentType.purchaseOrder') },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'ru', label: 'Русский' },
  ];

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose}></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center">
          <div className="relative h-screen w-full max-w-6xl transform rounded-lg bg-white shadow-xl dark:bg-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {template ? t('templates.editTemplate') : t('templates.addTemplate')}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-[calc(100%-120px)] gap-4 overflow-hidden p-6">
              {/* Form Panel */}
              <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('templates.name')}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('templates.nameTooltip')}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('templates.key')}
                  </label>
                  <input
                    type="text"
                    name="key"
                    value={formData.key}
                    onChange={handleInputChange}
                    placeholder={t('templates.keyTooltip')}
                    disabled={!!template}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:disabled:bg-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('templates.language')}
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('templates.documentType')}
                  </label>
                  <select
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {documentTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('templates.assignedState')}
                  </label>
                  <select
                    name="assignedState"
                    value={formData.assignedState}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select State</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                {/* Variables Panel */}
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex w-full items-center gap-2 font-medium text-gray-700 dark:text-gray-300"
                  >
                    <InformationCircleIcon className="h-5 w-5" />
                    {t('templates.viewVariables')}
                  </button>
                  {showVariables && !loading && (
                    <TemplateVariablesPanel variables={variables} />
                  )}
                </div>
              </div>

              {/* Editor Panel */}
              <div className="flex-1 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                <textarea
                  className="h-full w-full resize-none bg-gray-50 p-4 font-mono text-sm dark:bg-gray-800 dark:text-white"
                  value={formData.content}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  placeholder="Enter your AsciiDoc template content here..."
                  rows={20}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
