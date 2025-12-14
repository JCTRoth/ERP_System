-- V2__Seed_base_translations.sql
-- Seed basic translation keys and values

-- Common namespace keys
INSERT INTO translation_keys (key_name, namespace, description) VALUES
('app.title', 'common', 'Application title'),
('app.loading', 'common', 'Loading indicator text'),
('app.error.generic', 'common', 'Generic error message'),
('app.error.notFound', 'common', 'Not found error message'),
('app.error.unauthorized', 'common', 'Unauthorized error message'),
('actions.save', 'common', 'Save button'),
('actions.cancel', 'common', 'Cancel button'),
('actions.delete', 'common', 'Delete button'),
('actions.edit', 'common', 'Edit button'),
('actions.create', 'common', 'Create button'),
('actions.submit', 'common', 'Submit button'),
('actions.search', 'common', 'Search button/placeholder'),
('actions.filter', 'common', 'Filter button'),
('actions.export', 'common', 'Export button'),
('actions.import', 'common', 'Import button');

-- Auth namespace keys
INSERT INTO translation_keys (key_name, namespace, description) VALUES
('auth.login', 'auth', 'Login page title'),
('auth.logout', 'auth', 'Logout button'),
('auth.email', 'auth', 'Email field label'),
('auth.password', 'auth', 'Password field label'),
('auth.rememberMe', 'auth', 'Remember me checkbox'),
('auth.forgotPassword', 'auth', 'Forgot password link'),
('auth.loginButton', 'auth', 'Login submit button'),
('auth.signIn', 'auth', 'Sign in button and title'),
('auth.demoCredentials', 'auth', 'Demo credentials label'),
('auth.error.invalidCredentials', 'auth', 'Invalid credentials error');

-- Navigation namespace keys
INSERT INTO translation_keys (key_name, namespace, description) VALUES
('nav.dashboard', 'nav', 'Dashboard menu item'),
('nav.companies', 'nav', 'Companies menu item'),
('nav.users', 'nav', 'Users menu item'),
('nav.products', 'nav', 'Products menu item'),
('nav.orders', 'nav', 'Orders menu item'),
('nav.accounting', 'nav', 'Accounting menu item'),
('nav.settings', 'nav', 'Settings menu item'),
('nav.translations', 'nav', 'Translations menu item'),
('nav.uiBuilder', 'nav', 'UI Builder menu item');

-- Get key IDs for seeding values
-- English translations
INSERT INTO translation_values (key_id, language, value_text)
SELECT tk.id, 'en', CASE tk.key_name
    WHEN 'app.title' THEN 'ERP System'
    WHEN 'app.loading' THEN 'Loading...'
    WHEN 'app.error.generic' THEN 'An error occurred'
    WHEN 'app.error.notFound' THEN 'Not found'
    WHEN 'app.error.unauthorized' THEN 'Unauthorized'
    WHEN 'actions.save' THEN 'Save'
    WHEN 'actions.cancel' THEN 'Cancel'
    WHEN 'actions.delete' THEN 'Delete'
    WHEN 'actions.edit' THEN 'Edit'
    WHEN 'actions.create' THEN 'Create'
    WHEN 'actions.submit' THEN 'Submit'
    WHEN 'actions.search' THEN 'Search'
    WHEN 'actions.filter' THEN 'Filter'
    WHEN 'actions.export' THEN 'Export'
    WHEN 'actions.import' THEN 'Import'
    WHEN 'auth.login' THEN 'Login'
    WHEN 'auth.logout' THEN 'Logout'
    WHEN 'auth.email' THEN 'Email'
    WHEN 'auth.password' THEN 'Password'
    WHEN 'auth.rememberMe' THEN 'Remember me'
    WHEN 'auth.forgotPassword' THEN 'Forgot password?'
    WHEN 'auth.loginButton' THEN 'Sign In'
    WHEN 'auth.signIn' THEN 'Sign In'
    WHEN 'auth.demoCredentials' THEN 'Demo credentials'
    WHEN 'auth.error.invalidCredentials' THEN 'Invalid email or password'
    WHEN 'nav.dashboard' THEN 'Dashboard'
    WHEN 'nav.companies' THEN 'Companies'
    WHEN 'nav.users' THEN 'Users'
    WHEN 'nav.products' THEN 'Products'
    WHEN 'nav.orders' THEN 'Orders'
    WHEN 'nav.accounting' THEN 'Accounting'
    WHEN 'nav.settings' THEN 'Settings'
    WHEN 'nav.translations' THEN 'Translations'
    WHEN 'nav.uiBuilder' THEN 'UI Builder'
    ELSE tk.key_name
END
FROM translation_keys tk;

-- German translations
INSERT INTO translation_values (key_id, language, value_text)
SELECT tk.id, 'de', CASE tk.key_name
    WHEN 'app.title' THEN 'ERP-System'
    WHEN 'app.loading' THEN 'Laden...'
    WHEN 'app.error.generic' THEN 'Ein Fehler ist aufgetreten'
    WHEN 'app.error.notFound' THEN 'Nicht gefunden'
    WHEN 'app.error.unauthorized' THEN 'Nicht autorisiert'
    WHEN 'actions.save' THEN 'Speichern'
    WHEN 'actions.cancel' THEN 'Abbrechen'
    WHEN 'actions.delete' THEN 'Löschen'
    WHEN 'actions.edit' THEN 'Bearbeiten'
    WHEN 'actions.create' THEN 'Erstellen'
    WHEN 'actions.submit' THEN 'Absenden'
    WHEN 'actions.search' THEN 'Suchen'
    WHEN 'actions.filter' THEN 'Filtern'
    WHEN 'actions.export' THEN 'Exportieren'
    WHEN 'actions.import' THEN 'Importieren'
    WHEN 'auth.login' THEN 'Anmelden'
    WHEN 'auth.logout' THEN 'Abmelden'
    WHEN 'auth.email' THEN 'E-Mail'
    WHEN 'auth.password' THEN 'Passwort'
    WHEN 'auth.rememberMe' THEN 'Angemeldet bleiben'
    WHEN 'auth.forgotPassword' THEN 'Passwort vergessen?'
    WHEN 'auth.loginButton' THEN 'Anmelden'
    WHEN 'auth.signIn' THEN 'Anmelden'
    WHEN 'auth.demoCredentials' THEN 'Demo-Zugangsdaten'
    WHEN 'auth.error.invalidCredentials' THEN 'Ungültige E-Mail oder Passwort'
    WHEN 'nav.dashboard' THEN 'Dashboard'
    WHEN 'nav.companies' THEN 'Unternehmen'
    WHEN 'nav.users' THEN 'Benutzer'
    WHEN 'nav.products' THEN 'Produkte'
    WHEN 'nav.orders' THEN 'Bestellungen'
    WHEN 'nav.accounting' THEN 'Buchhaltung'
    WHEN 'nav.settings' THEN 'Einstellungen'
    WHEN 'nav.translations' THEN 'Übersetzungen'
    WHEN 'nav.uiBuilder' THEN 'UI-Builder'
    ELSE tk.key_name
END
FROM translation_keys tk;

-- French translations
INSERT INTO translation_values (key_id, language, value_text)
SELECT tk.id, 'fr', CASE tk.key_name
    WHEN 'app.title' THEN 'Système ERP'
    WHEN 'app.loading' THEN 'Chargement...'
    WHEN 'app.error.generic' THEN 'Une erreur est survenue'
    WHEN 'app.error.notFound' THEN 'Non trouvé'
    WHEN 'app.error.unauthorized' THEN 'Non autorisé'
    WHEN 'actions.save' THEN 'Enregistrer'
    WHEN 'actions.cancel' THEN 'Annuler'
    WHEN 'actions.delete' THEN 'Supprimer'
    WHEN 'actions.edit' THEN 'Modifier'
    WHEN 'actions.create' THEN 'Créer'
    WHEN 'actions.submit' THEN 'Soumettre'
    WHEN 'actions.search' THEN 'Rechercher'
    WHEN 'actions.filter' THEN 'Filtrer'
    WHEN 'actions.export' THEN 'Exporter'
    WHEN 'actions.import' THEN 'Importer'
    WHEN 'auth.login' THEN 'Connexion'
    WHEN 'auth.logout' THEN 'Déconnexion'
    WHEN 'auth.email' THEN 'Email'
    WHEN 'auth.password' THEN 'Mot de passe'
    WHEN 'auth.rememberMe' THEN 'Se souvenir de moi'
    WHEN 'auth.forgotPassword' THEN 'Mot de passe oublié?'
    WHEN 'auth.loginButton' THEN 'Se connecter'
    WHEN 'auth.signIn' THEN 'Se connecter'
    WHEN 'auth.demoCredentials' THEN 'Identifiants de démonstration'
    WHEN 'auth.error.invalidCredentials' THEN 'Email ou mot de passe invalide'
    WHEN 'nav.dashboard' THEN 'Tableau de bord'
    WHEN 'nav.companies' THEN 'Entreprises'
    WHEN 'nav.users' THEN 'Utilisateurs'
    WHEN 'nav.products' THEN 'Produits'
    WHEN 'nav.orders' THEN 'Commandes'
    WHEN 'nav.accounting' THEN 'Comptabilité'
    WHEN 'nav.settings' THEN 'Paramètres'
    WHEN 'nav.translations' THEN 'Traductions'
    WHEN 'nav.uiBuilder' THEN 'Constructeur UI'
    ELSE tk.key_name
END
FROM translation_keys tk;

-- Russian translations
INSERT INTO translation_values (key_id, language, value_text)
SELECT tk.id, 'ru', CASE tk.key_name
    WHEN 'app.title' THEN 'ERP Система'
    WHEN 'app.loading' THEN 'Загрузка...'
    WHEN 'app.error.generic' THEN 'Произошла ошибка'
    WHEN 'app.error.notFound' THEN 'Не найдено'
    WHEN 'app.error.unauthorized' THEN 'Не авторизован'
    WHEN 'actions.save' THEN 'Сохранить'
    WHEN 'actions.cancel' THEN 'Отмена'
    WHEN 'actions.delete' THEN 'Удалить'
    WHEN 'actions.edit' THEN 'Редактировать'
    WHEN 'actions.create' THEN 'Создать'
    WHEN 'actions.submit' THEN 'Отправить'
    WHEN 'actions.search' THEN 'Поиск'
    WHEN 'actions.filter' THEN 'Фильтр'
    WHEN 'actions.export' THEN 'Экспорт'
    WHEN 'actions.import' THEN 'Импорт'
    WHEN 'auth.login' THEN 'Вход'
    WHEN 'auth.logout' THEN 'Выход'
    WHEN 'auth.email' THEN 'Электронная почта'
    WHEN 'auth.password' THEN 'Пароль'
    WHEN 'auth.rememberMe' THEN 'Запомнить меня'
    WHEN 'auth.forgotPassword' THEN 'Забыли пароль?'
    WHEN 'auth.loginButton' THEN 'Войти'
    WHEN 'auth.signIn' THEN 'Войти'
    WHEN 'auth.demoCredentials' THEN 'Демо учетные данные'
    WHEN 'auth.error.invalidCredentials' THEN 'Неверный email или пароль'
    WHEN 'nav.dashboard' THEN 'Панель управления'
    WHEN 'nav.companies' THEN 'Компании'
    WHEN 'nav.users' THEN 'Пользователи'
    WHEN 'nav.products' THEN 'Товары'
    WHEN 'nav.orders' THEN 'Заказы'
    WHEN 'nav.accounting' THEN 'Бухгалтерия'
    WHEN 'nav.settings' THEN 'Настройки'
    WHEN 'nav.translations' THEN 'Переводы'
    WHEN 'nav.uiBuilder' THEN 'Конструктор UI'
    ELSE tk.key_name
END
FROM translation_keys tk;
