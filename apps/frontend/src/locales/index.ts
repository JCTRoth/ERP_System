// Local translation files - these serve as fallbacks when the translation service is unavailable
// The translation service can override these values

import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import ru from './ru.json';

export type Language = 'en' | 'de' | 'fr' | 'ru';

export const localTranslations: Record<Language, Record<string, string>> = {
  en,
  de,
  fr,
  ru,
};

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'de', 'fr', 'ru'];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  ru: 'Русский',
};
