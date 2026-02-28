import { useEscapeKey } from '../hooks/useEscapeKey';
import { KEYBOARD_SHORTCUTS, SHORTCUT_CATEGORIES } from '../hooks/keyboardShortcuts';
import { useI18n } from '../providers/I18nProvider';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  const { t } = useI18n();
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('shortcuts.title') || 'Keyboard Shortcuts'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {SHORTCUT_CATEGORIES.map((category) => {
            const shortcuts = KEYBOARD_SHORTCUTS.filter(
              (s) => s.category === category.id
            );
            if (shortcuts.length === 0) return null;

            return (
              <div key={category.id}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t(category.i18nKey) || category.label}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t(shortcut.i18nKey) || shortcut.description}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.split('+').map((part, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span className="mx-0.5 text-gray-400">+</span>
                            )}
                            <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {part}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Tip */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            {t('shortcuts.tip') || 'Press ? at any time to toggle this panel'}
          </p>
        </div>
      </div>
    </div>
  );
}
