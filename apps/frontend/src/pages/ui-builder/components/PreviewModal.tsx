import { useState, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { UIComponent } from '../types';
import ComponentRenderer from './ComponentRenderer';
import { useI18n } from '../../../providers/I18nProvider';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: { id: string; components: UIComponent[] }[];
  pageName?: string;
  scripts?: Record<string, string>;
}

export default function PreviewModal({ isOpen, onClose, rows, pageName, scripts = {} }: PreviewModalProps) {
  const { t } = useI18n();
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const handleButtonClick = useCallback((component: UIComponent, event: React.MouseEvent) => {
    const script = component.script || scripts[component.id];
    if (!script) {
      setConsoleOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Button "${component.props.label}" clicked (no script assigned)`]);
      return;
    }

    const logs: string[] = [];
    const mockConsole = {
      log: (...args: unknown[]) => logs.push(args.map(a => JSON.stringify(a)).join(' ')),
      warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(a => JSON.stringify(a)).join(' ')),
      error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(a => JSON.stringify(a)).join(' ')),
      info: (...args: unknown[]) => logs.push('[INFO] ' + args.map(a => JSON.stringify(a)).join(' ')),
    };

    try {
      const fn = new Function(
        'event',
        'componentId',
        'console',
        'alert',
        'document',
        'fetch',
        script
      );

      fn(
        event.nativeEvent,
        component.id,
        mockConsole,
        (msg: string) => {
          logs.push(`[ALERT] ${msg}`);
          alert(msg);
        },
        document,
        fetch
      );

      setConsoleOutput(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Executed script for "${component.props.label}"`,
        ...logs.map(log => `  → ${log}`)
      ]);
    } catch (err) {
      setConsoleOutput(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Script error for "${component.props.label}": ${err instanceof Error ? err.message : 'Unknown error'}`
      ]);
    }
  }, [scripts]);

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
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {t('uiBuilder.noComponents')}
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-3 gap-2">
                      {row.components.map((component) => {
                        const span = component.columnSpan || 1;
                        const start = component.startColumn ?? 1;
                        const style: React.CSSProperties = { gridColumn: `${start} / span ${span}` };
                        return (
                          <div key={component.id} style={style} className={`p-2`}>
                            <ComponentRenderer 
                              component={component} 
                              onButtonClick={handleButtonClick}
                              isPreview={true}
                            />
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Console Output */}
        {consoleOutput.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-2 bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium">Console Output</span>
              <button
                onClick={() => setConsoleOutput([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto bg-gray-900 p-3 font-mono text-xs text-green-400">
              {consoleOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}

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
