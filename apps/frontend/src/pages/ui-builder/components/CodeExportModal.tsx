import { useState } from 'react';
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { UIComponent } from '../types';
import { generateReactFromRows } from '../utils';
import { useI18n } from '../../../providers/I18nProvider';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: { id: string; components: UIComponent[] }[];
}

type ExportFormat = 'react' | 'json';

export default function CodeExportModal({ isOpen, onClose, rows }: CodeExportModalProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<ExportFormat>('react');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const code = format === 'react' ? generateReactFromRows(rows) : JSON.stringify(rows, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'react' ? 'GeneratedPage.tsx' : 'page-schema.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">{t('uiBuilder.exportCode')}</h2>
            <p className="text-sm text-gray-500">{t('uiBuilder.exportCodeDescription')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('react')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                format === 'react'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              React Component
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                format === 'json'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              JSON Schema
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="max-h-[calc(90vh-220px)] overflow-y-auto p-6">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2 rounded-md bg-gray-800 p-2 text-gray-300 hover:bg-gray-700"
              title={t('common.copy')}
            >
              {copied ? (
                <CheckIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ClipboardIcon className="h-5 w-5" />
              )}
            </button>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              <code>{code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            {t('common.close')}
          </button>
          <button onClick={handleDownload} className="btn-primary">
            {t('uiBuilder.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
