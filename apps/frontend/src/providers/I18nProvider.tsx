import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useAuthStore } from '../stores/authStore';

const GET_TRANSLATIONS = gql`
  query GetTranslations($language: String!, $companyId: ID) {
    translations(language: $language, companyId: $companyId) {
      key
      value
    }
  }
`;

type Language = 'en' | 'de' | 'fr' | 'ru';

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

const SUPPORTED_LANGUAGES: Language[] = ['en', 'de', 'fr', 'ru'];

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  ru: 'Русский',
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('erp-language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0] as Language;
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
  });

  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);

  const { data, loading } = useQuery(GET_TRANSLATIONS, {
    variables: { language, companyId: currentCompanyId },
    skip: !language,
  });

  useEffect(() => {
    if (data?.translations) {
      const newTranslations = new Map<string, string>();
      data.translations.forEach((t: { key: string; value: string }) => {
        newTranslations.set(t.key, t.value);
      });
      setTranslations(newTranslations);
    }
  }, [data]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('erp-language', lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = translations.get(key) || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    return value;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, isLoading: loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES };
export type { Language };
