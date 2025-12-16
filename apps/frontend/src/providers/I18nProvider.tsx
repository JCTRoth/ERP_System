import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { getApolloClient } from '../lib/apollo';
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
  t: (key: string, params?: Record<string, string | number> | { default?: string } ) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
  localeVersion: number;  translations: Map<string, string>;}

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
    errorPolicy: 'ignore',
    onError: () => {},
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
    // clear current translations to avoid stale UI and trigger loading state
    setTranslations(new Map());
    setLanguageState(lang);
    localStorage.setItem('erp-language', lang);
    document.documentElement.lang = lang;

    // reset Apollo store so any language-dependent queries refetch
    try {
      const client = getApolloClient();
      client.resetStore().catch(() => client.clearStore());
    } catch (err) {
      // ignore if Apollo client not available
    }
  }, []);

  // localeVersion increments whenever translations or language change, to force consumer updates
  const [localeVersion, setLocaleVersion] = useState(0);

  useEffect(() => {
    // bump version when translations map updates
    setLocaleVersion((v) => v + 1);
  }, [translations, language]);

  const t = useCallback((key: string, params?: Record<string, string | number> | { default?: string }): string => {
    const fallback = (params && 'default' in params) ? (params as any).default : undefined;

    // try direct lookup
    let value = translations.get(key) ?? undefined;

    // try common namespaced variants, e.g. `auth.signIn` -> `auth.auth.signIn`
    if (!value) {
      const parts = key.split('.');
      if (parts.length === 2) {
        const namespaced = `${parts[0]}.${parts[0]}.${parts[1]}`;
        value = translations.get(namespaced) ?? undefined;
      }
    }

    // fallback to provided default or the key itself humanized
    value = value ?? fallback ?? key.replace(/\./g, ' ');

    // interpolate params
    let out = String(value);
    if (params) {
      const entries = Object.entries(params as Record<string, string | number>);
      entries.forEach(([paramKey, paramValue]) => {
        if (paramKey === 'default') return;
        out = out.replace(new RegExp(`\{${paramKey}\}`, 'g'), String(paramValue));
      });
    }

    return out;
  }, [translations]);

  const value = useMemo(() => ({ t, language, setLanguage, isLoading: loading, localeVersion, translations }), [t, language, setLanguage, loading, localeVersion, translations]);

  return (
    <I18nContext.Provider value={value}>
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
