import { useState } from 'react';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore.ts';
import {
  Cog6ToothIcon,
  CodeBracketIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

type SettingsTab = 'general' | 'developer' | 'interface' | 'account';

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const showTranslationKeys = useUIStore((state) => state.showTranslationKeys);
  const toggleTranslationKeys = useUIStore((state) => state.toggleTranslationKeys);
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general' as const, label: t('settings.general') || 'General', icon: Cog6ToothIcon },
    ...(isAdmin() ? [{ id: 'developer' as const, label: t('settings.developer') || 'Development', icon: CodeBracketIcon }] : []),
    { id: 'interface' as const, label: t('settings.interface') || 'Interface', icon: ServerIcon },
    { id: 'account' as const, label: t('settings.account') || 'Account', icon: UserIcon },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="contents">
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
                      {lang === 'en' ? '🇬🇧' : lang === 'de' ? '🇩🇪' : lang === 'fr' ? '🇫🇷' : 'RU'}
                    </span>
                    {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Developer Tab (Admin Only) */}
        {activeTab === 'developer' && isAdmin() && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('settings.developer')}</h2>
            
            <div className="space-y-6">
              {/* Show Translation Keys Toggle */}
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

              {/* Debug Info */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="mb-3 font-medium">{t('settings.debugInfo') || 'Debug Information'}</h3>
                <div className="rounded-lg bg-gray-50 p-4 font-mono text-sm dark:bg-gray-900">
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    <p>User ID: {user?.id || 'N/A'}</p>
                    <p>Role: {user?.role || 'user'}</p>
                    <p>Language: {language}</p>
                    <p>Theme: {theme}</p>
                    <p>Translation Keys: {showTranslationKeys ? 'Visible' : 'Hidden'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interface Tab */}
        {activeTab === 'interface' && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('settings.apiDocumentation') || 'API Documentation'}</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.apiDocumentationDesc') || 'Access the API documentation and interface endpoints for the ERP system services.'}
            </p>
            
            <div className="space-y-4">
              {/* Masterdata Service API */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t('settings.masterdataServiceApi') || 'Master Data Service API'}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.masterdataServiceApiDesc') || 'Core business entities including customers, suppliers, employees, assets, currencies, and reference data management. Health check.'}
                    </p>
                    <p className="mt-2 font-mono text-xs text-gray-500">http://localhost:5002/swagger/index.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="http://localhost:5002/swagger/index.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      {t('common.open')}
                    </a>
                  </div>
                </div>
              </div>

              {/* Shop Service Swagger */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t('settings.shopServiceApi') || 'Shop Service API'}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.shopServiceApiDesc') || 'E-commerce functionality including products, categories, orders, shopping cart, and inventory management.'}
                    </p>
                    <p className="mt-2 font-mono text-xs text-gray-500">http://localhost:5003/swagger</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="http://localhost:5003/swagger"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      {t('common.open')}
                    </a>
                  </div>
                </div>
              </div>

              {/* Company Service */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t('settings.companyServiceApi') || 'Company Service API'}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.companyServiceApiDesc') || 'Multi-tenant company management, organizational structure, and company settings. Java/Spring Boot service.'}
                    </p>
                    <p className="mt-2 font-mono text-xs text-gray-500">http://localhost:8080/swagger-ui/index.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="http://localhost:8080/swagger-ui/index.html?docExpansion=full&tryItOutEnabled=true&displayRequestDuration=true&filter=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      {t('common.open')}
                    </a>
                  </div>
                </div>
              </div>

              {/* Translation Service */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t('settings.translationServiceApi') || 'Translation Service API'}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.translationServiceApiDesc') || 'Internationalization and localization. Manages translation keys, supported languages, and dynamic content translation.'}
                    </p>
                    <p className="mt-2 font-mono text-xs text-gray-500">http://localhost:8081/swagger-ui.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="http://localhost:8081/swagger-ui/index.html?docExpansion=full&tryItOutEnabled=true&displayRequestDuration=true&filter=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      {t('common.open')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
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
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('users.role') || 'Role'}</span>
                <span className="capitalize">{user?.role || 'user'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
