import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { LanguageConfig } from '@erp/shared-types';

// ============================================================================
// Types
// ============================================================================

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  showKeys: boolean;
  setShowKeys: (show: boolean) => void;
  languages: LanguageConfig[];
  isLoading: boolean;
}

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
  languages: LanguageConfig[];
  loadTranslations: (lang: string) => Promise<Record<string, string>>;
  onLanguageChange?: (lang: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const I18nContext = createContext<I18nContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function I18nProvider({
  children,
  defaultLanguage = 'en',
  languages,
  loadTranslations,
  onLanguageChange,
}: I18nProviderProps) {
  const [language, setLanguageState] = useState(defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false;
    
    setIsLoading(true);
    loadTranslations(language)
      .then((data) => {
        if (!cancelled) {
          setTranslations(data);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load translations:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, loadTranslations]);

  // Set language and notify
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    onLanguageChange?.(lang);
    
    // Persist to localStorage
    try {
      localStorage.setItem('erp-language', lang);
    } catch {
      // Ignore localStorage errors
    }
  }, [onLanguageChange]);

  // Translation function with interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // Show keys mode for debugging
    if (showKeys) {
      return `[${key}]`;
    }

    let value = translations[key];
    
    // Fallback to key if not found
    if (value === undefined) {
      console.warn(`Missing translation: ${key}`);
      return `[${key}]`;
    }

    // Interpolate parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return value;
  }, [translations, showKeys]);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('erp-language');
      if (stored && languages.some(l => l.code === stored)) {
        setLanguageState(stored);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [languages]);

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    showKeys,
    setShowKeys,
    languages,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTranslation() {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  return context;
}

// ============================================================================
// Components
// ============================================================================

interface FlagSwitcherProps {
  className?: string;
}

export function FlagSwitcher({ className }: FlagSwitcherProps) {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`
            text-2xl p-1 rounded transition-all
            ${language === lang.code 
              ? 'bg-primary/20 ring-2 ring-primary' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 opacity-60 hover:opacity-100'
            }
          `}
          title={lang.name}
          aria-label={`Switch to ${lang.name}`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}

interface ShowKeysToggleProps {
  className?: string;
}

export function ShowKeysToggle({ className }: ShowKeysToggleProps) {
  const { showKeys, setShowKeys, t } = useTranslation();

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className || ''}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {t('admin.translations.showKeys')}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          checked={showKeys}
          onChange={(e) => setShowKeys(e.target.checked)}
          className="sr-only"
        />
        <div className={`
          w-10 h-6 rounded-full transition-colors
          ${showKeys ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
        `}>
          <div className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${showKeys ? 'translate-x-5' : 'translate-x-1'}
          `} />
        </div>
      </div>
    </label>
  );
}

// ============================================================================
// Utility: Trans component for JSX interpolation
// ============================================================================

interface TransProps {
  i18nKey: string;
  components?: Record<string, ReactNode>;
  values?: Record<string, string | number>;
}

export function Trans({ i18nKey, components, values }: TransProps) {
  const { t, showKeys } = useTranslation();

  if (showKeys) {
    return <>[{i18nKey}]</>;
  }

  let text = t(i18nKey, values);

  // If no components to interpolate, return plain text
  if (!components) {
    return <>{text}</>;
  }

  // Split by component placeholders like <0>text</0>
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  Object.entries(components).forEach(([tag, component]) => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }
      
      // Add the component with inner text
      if (typeof component === 'function') {
        parts.push((component as (children: string) => ReactNode)(match[1]));
      } else {
        parts.push(
          <span key={key++}>
            {component}
            {match[1]}
          </span>
        );
      }
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < remaining.length) {
      remaining = remaining.slice(lastIndex);
    } else {
      remaining = '';
    }
  });

  if (remaining) {
    parts.push(remaining);
  }

  return <>{parts}</>;
}

// ============================================================================
// Re-exports
// ============================================================================

export type { I18nContextType, I18nProviderProps, LanguageConfig };
