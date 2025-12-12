import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, Language } from '../providers/I18nProvider';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const showTranslationKeys = useUIStore((state) => state.showTranslationKeys);
  const toggleTranslationKeys = useUIStore((state) => state.toggleTranslationKeys);
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('settings.appearance')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label mb-2">{t('settings.theme')}</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={`rounded-md px-4 py-2 ${
                      theme === themeOption
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`settings.theme${themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('settings.language')}</h2>
          
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`rounded-md px-4 py-3 text-center ${
                  language === lang
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <span className="block text-2xl mb-1">
                  {lang === 'en' ? '🇬🇧' : lang === 'de' ? '🇩🇪' : lang === 'fr' ? '🇫🇷' : '🇷🇺'}
                </span>
                {LANGUAGE_NAMES[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Developer Settings */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('settings.developer')}</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.showTranslationKeys')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.showTranslationKeysDesc')}
              </p>
            </div>
            <button
              onClick={toggleTranslationKeys}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                showTranslationKeys ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  showTranslationKeys ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('settings.account')}</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('users.email')}</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('users.firstName')}</span>
              <span>{user?.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('users.lastName')}</span>
              <span>{user?.lastName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
