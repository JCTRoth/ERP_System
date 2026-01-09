import { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useAuthStore } from '../../stores/authStore';
import * as templatesApi from '../../lib/api/templates';
import TemplatePreviewModal from './TemplatePreviewModal';
import TemplateEditorModal from './TemplateEditorModal';

interface Template {
  id: string;
  key: string;
  name: string;
  language: string;
  documentType: string;
  assignedState?: string;
  mainObjectType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SelectedTemplate extends Template {
  content: string;
  companyId: string;
}

export default function TemplatesPage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SelectedTemplate | null>(null);

  const companyId = currentCompanyId || '1';

  // Fetch templates
  useEffect(() => {
    if (!companyId) return;
    
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const data = await templatesApi.getTemplates(
          companyId,
          languageFilter !== 'all' ? languageFilter : undefined,
          documentTypeFilter !== 'all' ? documentTypeFilter : undefined
        );
        setTemplates(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [companyId, languageFilter, documentTypeFilter]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorModalOpen(true);
  };

  const handleEdit = async (template: Template) => {
    try {
      const fullTemplate = await templatesApi.getTemplate(template.id);
      setEditingTemplate({
        ...fullTemplate,
        companyId,
        content: (fullTemplate as any).content || '',
      } as SelectedTemplate);
      setIsEditorModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  const handlePreview = async (template: Template) => {
    try {
      const fullTemplate = await templatesApi.getTemplate(template.id);
      setSelectedTemplate({
        ...fullTemplate,
        companyId,
        content: (fullTemplate as any).content || '',
      } as SelectedTemplate);
      setIsPreviewModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('templates.confirmDelete'))) return;

    try {
      await templatesApi.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleSaveTemplate = async (data: any) => {
    try {
      if (editingTemplate) {
        // Update existing
        await templatesApi.updateTemplate(editingTemplate.id, {
          name: data.name,
          content: data.content,
          language: data.language,
          documentType: data.documentType,
          assignedState: data.assignedState,
        });
      } else {
        // Create new
        await templatesApi.createTemplate({
          ...data,
          companyId,
          createdBy: user?.id || 'system',
        });
      }
      // Refetch templates
      const updatedTemplates = await templatesApi.getTemplates(
        companyId,
        languageFilter !== 'all' ? languageFilter : undefined,
        documentTypeFilter !== 'all' ? documentTypeFilter : undefined
      );
      setTemplates(updatedTemplates);
      setIsEditorModalOpen(false);
      setEditingTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const documentTypeOptions = [
    { value: 'invoice', label: t('templates.documentType.invoice') },
    { value: 'deliveryNote', label: t('templates.documentType.deliveryNote') },
    { value: 'shippingNotice', label: t('templates.documentType.shippingNotice') },
    { value: 'cancellation', label: t('templates.documentType.cancellation') },
    { value: 'refund', label: t('templates.documentType.refund') },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('templates.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('templates.subtitle')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          <PlusIcon className="h-5 w-5" />
          {t('templates.addTemplate')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('templates.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Languages</option>
          {languageOptions.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <select
          value={documentTypeFilter}
          onChange={(e) => setDocumentTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Document Types</option>
          {documentTypeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
        </div>
      )}

      {/* Templates Table */}
      {!loading && filteredTemplates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">{t('templates.noTemplates')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('templates.name')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('templates.key')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('templates.language')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('templates.documentType')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('templates.assignedState')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTemplates.map((template) => (
                <tr
                  key={template.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-700">
                      {template.key}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.language.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {documentTypeOptions.find((t) => t.value === template.documentType)?.label}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.assignedState || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreview(template)}
                        className="rounded bg-blue-100 p-2 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                        title={t('templates.preview')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="rounded bg-yellow-100 p-2 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="rounded bg-red-100 p-2 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        title={t('common.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorModalOpen && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => {
            setIsEditorModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}
