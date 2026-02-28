import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

interface KeyboardShortcutsContextType {
  /** Whether the shortcuts help overlay is visible */
  isHelpOpen: boolean;
  /** Open the shortcuts help overlay */
  openHelp: () => void;
  /** Close the shortcuts help overlay */
  closeHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  isHelpOpen: false,
  openHelp: () => {},
  closeHelp: () => {},
});

export const useKeyboardShortcutsContext = () => useContext(KeyboardShortcutsContext);

/**
 * Returns true if the currently focused element is a text-input field.
 * Shortcuts that use bare keys (N, R, /) should be suppressed when user is typing.
 */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();
    // Only suppress for text-like inputs
    return ['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(type);
  }
  return (
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Checks whether any modal/dialog overlay is currently visible in the DOM.
 * Modals use `fixed inset-0 z-50` classes.
 */
function isModalOpen(): boolean {
  const overlays = document.querySelectorAll('.fixed.inset-0.z-50');
  return overlays.length > 0;
}

interface Props {
  children: React.ReactNode;
}

export default function KeyboardShortcutsProvider({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const shift = e.shiftKey;
      const inputActive = isInputFocused();
      const modalVisible = isModalOpen();

      // --- Help overlay: ? (Shift+/ on US layout, or just ?) ---
      if (key === '?' && !ctrlOrMeta && !alt && !inputActive && !modalVisible) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // --- Ctrl+, → Settings ---
      if (key === ',' && ctrlOrMeta && !alt && !shift) {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // Don't process bare-key shortcuts when inside an input or when a modal is open
      if (inputActive || modalVisible || isHelpOpen) return;

      // --- / → Focus search input ---
      if (key === '/' && !ctrlOrMeta && !alt && !shift) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[data-shortcut-search], input[type="search"], input[placeholder*="earch"], input[placeholder*="uche"], input[placeholder*="echerche"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          return;
        }
      }

      // --- N → Create new (triggers click on the primary "create" button) ---
      if (key === 'n' && !ctrlOrMeta && !alt && !shift) {
        const createBtn = document.querySelector<HTMLButtonElement>(
          'button[data-shortcut-create], button.btn-primary'
        );
        if (createBtn) {
          e.preventDefault();
          createBtn.click();
          return;
        }
      }

      // --- R → Refresh (triggers click on a refresh button if present, otherwise no-op) ---
      if (key === 'r' && !ctrlOrMeta && !alt && !shift) {
        // We don't have explicit refresh buttons on most pages,
        // but if one is marked, click it
        const refreshBtn = document.querySelector<HTMLButtonElement>(
          'button[data-shortcut-refresh]'
        );
        if (refreshBtn) {
          e.preventDefault();
          refreshBtn.click();
          return;
        }
      }

      // --- Alt+key navigation shortcuts ---
      if (alt && !ctrlOrMeta && !shift) {
        const routes: Record<string, string> = {
          h: '/',
          p: '/products',
          o: '/orders',
          a: '/accounting',
          m: '/masterdata',
          t: '/templates',
          u: '/users',
          c: '/companies',
        };
        const route = routes[key.toLowerCase()];
        if (route && location.pathname !== route) {
          e.preventDefault();
          navigate(route);
          return;
        }
      }

      // --- Ctrl+Enter → Submit form (in modal context, but we handle it globally) ---
      if (key === 'Enter' && ctrlOrMeta && !alt && !shift) {
        const submitBtn = document.querySelector<HTMLButtonElement>(
          '.fixed.inset-0.z-50 button[type="submit"], .fixed.inset-0.z-50 form button[type="submit"]'
        );
        if (submitBtn) {
          e.preventDefault();
          submitBtn.click();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname, isHelpOpen]);

  return (
    <KeyboardShortcutsContext.Provider value={{ isHelpOpen, openHelp, closeHelp }}>
      {children}
      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />
    </KeyboardShortcutsContext.Provider>
  );
}
