import { useState } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { useUIBuilderStore, UIPage } from '../../../stores/uiBuilderStore';
import { useI18n } from '../../../providers/I18nProvider';

interface PageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: UIPage) => void;
}

export default function PageManagerModal({ isOpen, onClose, onSelectPage }: PageManagerModalProps) {
  const { t } = useI18n();
  const {
    pages,
    currentPageId,
    addPage,
    deletePage,
    duplicatePage,
    setCurrentPage,
  } = useUIBuilderStore();

  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  if (!isOpen) return null;

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    
    const slug = newPageSlug.trim() || newPageName.toLowerCase().replace(/\s+/g, '-');
    const newPage = addPage({
      name: newPageName.trim(),
      slug,
      components: [],
    });
    
    setNewPageName('');
    setNewPageSlug('');
    setShowNewPageForm(false);
    onSelectPage(newPage);
    onClose();
  };

  const handleSelectPage = (page: UIPage) => {
    setCurrentPage(page.id);
    onSelectPage(page);
    onClose();
  };

  const handleDuplicatePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPage = duplicatePage(id);
    if (newPage) {
      onSelectPage(newPage);
      onClose();
    }
  };

  const handleDeletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('uiBuilder.confirmDeletePage'))) {
      deletePage(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">{t('uiBuilder.managePages')}</h2>
            <p className="text-sm text-gray-500">{t('uiBuilder.managePagesDescription')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* New Page Form */}
        {showNewPageForm && (
          <div className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1">{t('uiBuilder.pageName')}</label>
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder={t('uiBuilder.pageNamePlaceholder')}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label mb-1">{t('uiBuilder.pageSlug')}</label>
                <input
                  type="text"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder={t('uiBuilder.pageSlugPlaceholder')}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewPageForm(false)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreatePage}
                disabled={!newPageName.trim()}
                className="btn-primary"
              >
                {t('uiBuilder.createPage')}
              </button>
            </div>
          </div>
        )}

        {/* Page List */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          {!showNewPageForm && (
            <button
              onClick={() => setShowNewPageForm(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-600"
            >
              <PlusIcon className="h-5 w-5" />
              {t('uiBuilder.createNewPage')}
            </button>
          )}

          {pages.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t('uiBuilder.noPages')}
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    page.id === currentPageId
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{page.name}</h3>
                      {page.id === currentPageId && (
                        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          {t('uiBuilder.current')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">/{page.slug}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {t('uiBuilder.components')}: {page.components.length} •{' '}
                      {t('uiBuilder.updated')}: {formatDate(page.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleDuplicatePage(page.id, e)}
                      className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600"
                      title={t('common.duplicate')}
                    >
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => handleDeletePage(page.id, e)}
                      className="rounded p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                      title={t('common.delete')}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
