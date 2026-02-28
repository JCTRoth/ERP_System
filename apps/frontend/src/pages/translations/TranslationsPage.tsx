import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, ArrowDownTrayIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../providers/I18nProvider';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import TranslationModal from './TranslationModal';

const GET_TRANSLATION_KEYS = gql`
  query GetTranslationKeys {
    translationKeys {
      id
      keyName
      namespace
      values {
        language
        valueText
        companyId
      }
    }
  }
`;

interface TranslationValue {
  language: string;
  valueText: string;
  companyId?: string | null;
}

interface TranslationKey {
  id: string;
  keyName: string;
  namespace: string;
  values: TranslationValue[];
}

export default function TranslationsPage() {
  const { t, language, refreshTranslations } = useI18n();
  const showTranslationKeys = useUIStore((state) => state.showTranslationKeys);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | null>(null);
  const [filterNamespace, setFilterNamespace] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_TRANSLATION_KEYS, {
    errorPolicy: 'all',
  });

  const handleEdit = (translationKey: TranslationKey) => {
    setEditingKey(translationKey);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingKey(null);
  };

  const handleModalSaved = async () => {
    await Promise.all([refetch(), refreshTranslations()]);
  };

  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    const url = `/api/translations/export/${language}?format=${format}`;
    window.open(url, '_blank');
  };

  // Get unique namespaces
  const namespaces = Array.from(
    new Set(data?.translationKeys?.map((tk: TranslationKey) => tk.namespace) || [])
  );

  // Filter translations
  const filteredKeys = data?.translationKeys?.filter((tk: TranslationKey) => {
    const matchesNamespace = !filterNamespace || tk.namespace === filterNamespace;
    const fullKey = `${tk.namespace}.${tk.keyName}`.toLowerCase();
    const matchesSearch = !searchTerm || 
      tk.namespace.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tk.keyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullKey.includes(searchTerm.toLowerCase()) ||
      tk.values.some(v => v.valueText.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesNamespace && matchesSearch;
  }) || [];

  const getEffectiveValue = (tk: TranslationKey, lang: string): string | undefined => {
    if (currentCompanyId) {
      const companyValue = tk.values.find(v => v.language === lang && v.companyId === currentCompanyId);
      if (companyValue?.valueText) {
        return companyValue.valueText;
      }
    }

    const defaultValue = tk.values.find(v => v.language === lang && (v.companyId === null || v.companyId === undefined));
    return defaultValue?.valueText;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('translations.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('translations.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => handleExport('json')}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {t('translations.export')}
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t('translations.addKey')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder={t('translations.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-64"
        />
        <select
          value={filterNamespace}
          onChange={(e) => setFilterNamespace(e.target.value)}
          className="input w-48"
        >
          <option value="">{t('translations.allNamespaces')}</option>
          {namespaces.map((ns) => (
            <option key={ns as string} value={ns as string}>{ns as string}</option>
          ))}
        </select>
      </div>

      {/* $t{} Syntax Info */}
      <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-900/20">
        <p className="text-sm text-teal-800 dark:text-teal-300">
          <span className="font-semibold">Translation references:</span> Use{' '}
          <code className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-xs dark:bg-teal-900/50">$t{'{'}<em>key</em>{'}'}</code>{' '}
          syntax in <strong>UI Builder</strong> and <strong>Template Editor</strong> to reference these translations.
          Click the copy icon next to any key to copy its <code className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-xs dark:bg-teal-900/50">$t{'{'}'...{'}'}</code> reference.
          Translations set here override the built-in frontend language files.
        </p>
      </div>

      {showTranslationKeys && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Key display mode is active.</span>{' '}
            The UI intentionally shows translation keys (like <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">nav.templates</code>) instead of translated text.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex-1 min-h-0">
        <div className="overflow-x-auto h-full">
          <table className="w-full h-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('translations.key')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('translations.namespace')}
                </th>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <th key={lang} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {LANGUAGE_NAMES[lang]}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={3 + SUPPORTED_LANGUAGES.length} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                error && error.graphQLErrors?.some(e => e.extensions?.code === 'GRAPHQL_VALIDATION_FAILED') ? (
                  <tr>
                    <td colSpan={3 + SUPPORTED_LANGUAGES.length} className="px-6 py-4 text-center text-yellow-600">
                      {t('translations.validationErrorNotice') || 'Translations service schema is not available yet.'}
                    </td>
                  </tr>
                ) : 
                <tr>
                  <td colSpan={3 + SUPPORTED_LANGUAGES.length} className="px-6 py-4 text-center text-gray-500">
                    {t('translations.noTranslations')}
                  </td>
                </tr>
              ) : (
                filteredKeys.map((tk: TranslationKey) => {
                  const fullKey = `${tk.namespace}.${tk.keyName}`;
                  return (
                  <tr key={tk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <span>{fullKey}</span>
                        <CopyRefButton refKey={fullKey} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {tk.namespace}
                    </td>
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const valueText = getEffectiveValue(tk, lang);
                      return (
                        <td key={lang} className="max-w-xs truncate px-6 py-4">
                          {valueText || (
                            <span className="text-gray-400 italic">
                              {t('translations.missing')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(tk)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <TranslationModal
          translationKey={editingKey}
          companyId={currentCompanyId}
          onSaved={handleModalSaved}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

/** Small button to copy $t{key} reference to clipboard */
function CopyRefButton({ refKey }: { refKey: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`$t{${refKey}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      title={`Copy $t{${refKey}} to clipboard`}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <ClipboardIcon className="h-4 w-4" />
      )}
    </button>
  );
}
