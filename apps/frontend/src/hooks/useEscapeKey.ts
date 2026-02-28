import { useEffect } from 'react';

/**
 * Hook to handle Escape key press for closing modals/dialogs.
 * @param onEscape - callback to invoke when Escape is pressed. Pass undefined/null to disable.
 * @param isActive - whether the listener is active (defaults to true)
 */
export function useEscapeKey(onEscape: (() => void) | undefined | null, isActive = true) {
  useEffect(() => {
    if (!onEscape || !isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}
