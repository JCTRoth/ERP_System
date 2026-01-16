import { useState, useEffect } from 'react';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore.ts';
import {
  Cog6ToothIcon,
  CodeBracketIcon,
  ServerIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

type SettingsTab = 'general' | 'developer' | 'interface' | 'monitoring' | 'smtpServer' | 'account';

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const showTranslationKeys = useUIStore((state) => state.showTranslationKeys);
  const toggleTranslationKeys = useUIStore((state) => state.toggleTranslationKeys);
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  
  // Use current window location to construct dynamic URLs for API interfaces
  // This ensures the links work regardless of the domain (localhost, shopping-now.net, etc.)
  const baseUrl = `${window.location.protocol}//${window.location.hostname}`;
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [smtpConfig, setSmtpConfig] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    emailFrom: '',
    emailFromName: '',
    useTls: true,
    useSsl: false,
  });
  const [smtpSource, setSmtpSource] = useState<'database' | 'environment'>('environment');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Load SMTP configuration when SMTP tab is selected
  useEffect(() => {
    if (activeTab === 'smtpServer') {
      loadSmtpConfiguration();
    }
  }, [activeTab]);
  const loadSmtpConfiguration = async () => {
    try {
      console.log('Loading SMTP configuration from API...');
      setSmtpLoading(true);
      const response = await fetch('/api/smtp-configuration');
      const data = await response.json();
      console.log('SMTP API response:', data);
      
      if (data.config) {
        console.log('Setting SMTP config:', data.config);
        const newConfig = {
          smtpHost: data.config.smtpHost || '',
          smtpPort: data.config.smtpPort || 587,
          smtpUsername: data.config.smtpUsername || '',
          smtpPassword: data.config.smtpPassword === '***' ? '' : (data.config.smtpPassword || ''),
          emailFrom: data.config.emailFrom || '',
          emailFromName: data.config.emailFromName || '',
          useTls: data.config.useTls ?? true,
          useSsl: data.config.useSsl ?? false,
        };
        console.log('New config object:', newConfig);
        setSmtpConfig(newConfig);
        setSmtpSource(data.source);
        console.log('SMTP config set successfully');
      } else {
        console.log('No config in API response');
      }
    } catch (error) {
      console.error('Failed to load SMTP configuration:', error);
      setSmtpMessage({ type: 'error', text: t('settings.configurationFailed') });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSmtpSave = async () => {
    try {
      setSmtpLoading(true);
      setSmtpMessage(null);
      
      const response = await fetch('/api/smtp-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        setSmtpMessage({ type: 'success', text: t('settings.configurationSaved') });
        setSmtpSource('database');
        // Reload configuration to get updated values
        setTimeout(() => loadSmtpConfiguration(), 1000);
      } else {
        const errorMsg = data.message || data.error || t('settings.configurationFailed');
        setSmtpMessage({ type: 'error', text: errorMsg });
        console.error('Save error:', data);
      }
    } catch (error) {
      console.error('Failed to save SMTP configuration:', error);
      const errorText = error instanceof Error ? error.message : t('settings.configurationFailed');
      setSmtpMessage({ type: 'error', text: `Network error: ${errorText}` });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setSmtpLoading(true);
      setSmtpMessage(null);
      
      const response = await fetch('/api/smtp-configuration/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSmtpMessage({ type: 'success', text: t('settings.connectionSuccess') });
      } else {
        const errorMsg = data.message || t('settings.connectionFailed');
        setSmtpMessage({ type: 'error', text: errorMsg });
      }
    } catch (error) {
      console.error('Failed to test SMTP connection:', error);
      const errorText = error instanceof Error ? error.message : t('settings.connectionFailed');
      setSmtpMessage({ type: 'error', text: `Network error: ${errorText}` });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setSmtpMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    try {
      setSmtpLoading(true);
      setSmtpMessage(null);

      console.log('SMTP Test Email: Starting test email send');
      console.log('SMTP Test Email: Test email address:', testEmailAddress.trim());
      console.log('SMTP Test Email: SMTP config:', { ...smtpConfig, password: '[REDACTED]' });

      const requestBody = {
        ...smtpConfig,
        testEmailAddress: testEmailAddress.trim(),
      };

      console.log('SMTP Test Email: Sending request to /api/smtp-configuration/test-email');

      const response = await fetch('/api/smtp-configuration/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('SMTP Test Email: Response status:', response.status);
      console.log('SMTP Test Email: Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();

      console.log('SMTP Test Email: Response data:', data);

      if (data.success) {
        console.log('SMTP Test Email: Test email sent successfully');
        setSmtpMessage({ type: 'success', text: 'Test email sent successfully!' });
      } else {
        const errorMsg = data.message || 'Failed to send test email';
        console.error('SMTP Test Email: Server returned error:', errorMsg);
        console.error('SMTP Test Email: Full response data:', data);
        setSmtpMessage({ type: 'error', text: errorMsg });
      }
    } catch (error) {
      console.error('SMTP Test Email: Exception occurred:', error);
      console.error('SMTP Test Email: Error type:', error instanceof Error ? 'Error' : typeof error);
      console.error('SMTP Test Email: Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      const errorText = error instanceof Error ? error.message : 'Failed to send test email';
      setSmtpMessage({ type: 'error', text: `Network error: ${errorText}` });
    } finally {
      setSmtpLoading(false);
      console.log('SMTP Test Email: Test email process completed');
    }
  };

  const tabs = [
    { id: 'general' as const, label: t('settings.general') || 'General', icon: Cog6ToothIcon },
    ...(isAdmin() ? [{ id: 'developer' as const, label: t('settings.developer') || 'Development', icon: CodeBracketIcon }] : []),
    { id: 'interface' as const, label: t('settings.interface') || 'Interfaces', icon: ServerIcon },
    { id: 'monitoring' as const, label: 'Monitoring', icon: ChartBarIcon },
    { id: 'smtpServer' as const, label: t('settings.smtpServer') || 'SMTP Server', icon: ServerIcon },
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
                    <p className="mt-2 font-mono text-xs text-gray-500">{baseUrl}:5002/swagger/index.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${baseUrl}:5002/swagger/index.html`}
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
                    <p className="mt-2 font-mono text-xs text-gray-500">{baseUrl}:5003/swagger</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${baseUrl}:5003/swagger`}
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
                    <p className="mt-2 font-mono text-xs text-gray-500">{baseUrl}:8080/swagger-ui/index.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${baseUrl}:8080/swagger-ui/index.html?docExpansion=full&tryItOutEnabled=true&displayRequestDuration=true&filter=true`}
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
                    <p className="mt-2 font-mono text-xs text-gray-500">{baseUrl}:8081/swagger-ui.html</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${baseUrl}:8081/swagger-ui/index.html?docExpansion=full&tryItOutEnabled=true&displayRequestDuration=true&filter=true`}
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

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Monitoring Dashboard</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Access monitoring and observability tools for the ERP system.
            </p>
            
            <div className="space-y-4">
              {/* Grafana */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">Grafana Dashboard</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Visualize metrics, logs, and system performance with interactive dashboards.
                    </p>
                    <p className="mt-2 font-mono text-xs text-gray-500">{baseUrl}:3001</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${baseUrl}:3001`}
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

        {/* SMTP Server Tab */}
        {activeTab === 'smtpServer' && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('settings.smtpConfiguration')}</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.smtpConfigurationDesc')}
            </p>
            
            {smtpLoading && (
              <div className="mb-4 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
              </div>
            )}

            {smtpMessage && (
              <div className={`mb-4 rounded-lg p-4 ${
                smtpMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span>{smtpMessage.text}</span>
                  {smtpMessage.type === 'success' && smtpMessage.text === t('settings.connectionSuccess') && (
                    <div className="flex items-center gap-2 ml-4">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="test@example.com"
                        className="input text-sm px-2 py-1 w-48"
                        disabled={smtpLoading}
                      />
                      <button
                        onClick={handleSendTestEmail}
                        disabled={smtpLoading || !testEmailAddress.trim()}
                        className="btn-secondary text-sm px-3 py-1"
                      >
                        Send Test Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{t('common.status')}:</strong> {smtpSource === 'database' 
                  ? t('settings.useDatabaseConfiguration')
                  : t('settings.useEnvironmentVariables')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label">{t('settings.smtpHost')} *</label>
                  <input
                    type="text"
                    value={smtpConfig.smtpHost}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpHost: e.target.value })}
                    className="input w-full"
                    placeholder="smtp.example.com"
                    disabled={smtpLoading}
                  />
                </div>
                
                <div>
                  <label className="label">{t('settings.smtpPort')} *</label>
                  <input
                    type="number"
                    value={smtpConfig.smtpPort}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpPort: parseInt(e.target.value) || 587 })}
                    className="input w-full"
                    placeholder="587"
                    disabled={smtpLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label">{t('settings.smtpUsername')}</label>
                  <input
                    type="text"
                    value={smtpConfig.smtpUsername}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpUsername: e.target.value })}
                    className="input w-full"
                    placeholder="username@example.com"
                    disabled={smtpLoading}
                  />
                </div>
                
                <div>
                  <label className="label">{t('settings.smtpPassword')}</label>
                  <input
                    type="password"
                    value={smtpConfig.smtpPassword}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpPassword: e.target.value })}
                    className="input w-full"
                    placeholder="••••••••"
                    disabled={smtpLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label">{t('settings.emailFrom')} *</label>
                  <input
                    type="email"
                    value={smtpConfig.emailFrom}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, emailFrom: e.target.value })}
                    className="input w-full"
                    placeholder="noreply@example.com"
                    disabled={smtpLoading}
                  />
                </div>
                
                <div>
                  <label className="label">{t('settings.emailFromName')}</label>
                  <input
                    type="text"
                    value={smtpConfig.emailFromName}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, emailFromName: e.target.value })}
                    className="input w-full"
                    placeholder="ERP System"
                    disabled={smtpLoading}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={smtpConfig.useTls}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, useTls: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    disabled={smtpLoading}
                  />
                  <span className="text-sm">Use TLS (STARTTLS)</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={smtpConfig.useSsl}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, useSsl: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    disabled={smtpLoading}
                  />
                  <span className="text-sm">Use SSL</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTestConnection}
                  disabled={smtpLoading || !smtpConfig.smtpHost || !smtpConfig.emailFrom}
                  className="btn-secondary"
                >
                  {t('settings.testConnection')}
                </button>
                
                <button
                  onClick={handleSmtpSave}
                  disabled={smtpLoading || !smtpConfig.smtpHost || !smtpConfig.emailFrom}
                  className="btn-primary"
                >
                  {t('settings.saveConfiguration')}
                </button>
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
