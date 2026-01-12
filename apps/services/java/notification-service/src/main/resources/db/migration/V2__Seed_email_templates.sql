-- V2__Seed_email_templates.sql
-- MediVita email templates for all supported languages (EN, DE, FR, RU)

-- Welcome Email Templates
INSERT INTO email_templates (name, subject, body_html, body_text, language, description) VALUES
('welcome', 'Welcome to MediVita - Crafting Health for Life', 
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #2563eb;">Welcome to MediVita!</h1>
<p>Hello <span th:text="${firstName}">User</span>,</p>
<p>Your account has been successfully created. At MediVita, we specialize in innovative pharmaceuticals, blending advanced science with a passion for well-being.</p>
<p>Our mission: to deliver trusted, effective solutions for a healthier world.</p>
<p>Best regards,<br>The MediVita Team</p>
</body>
</html>',
'Welcome to MediVita - Crafting Health for Life

Hello ${firstName},

Your account has been successfully created. At MediVita, we specialize in innovative pharmaceuticals, blending advanced science with a passion for well-being.

Our mission: to deliver trusted, effective solutions for a healthier world.

Best regards,
The MediVita Team', 'en', 'Welcome email for new MediVita users'),

('welcome', 'Willkommen bei MediVita - Gesundheit fürs Leben',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #2563eb;">Willkommen bei MediVita!</h1>
<p>Hallo <span th:text="${firstName}">Benutzer</span>,</p>
<p>Ihr Konto wurde erfolgreich erstellt. Bei MediVita spezialisieren wir uns auf innovative Pharmazeutika und verbinden fortschrittliche Wissenschaft mit Leidenschaft für das Wohlbefinden.</p>
<p>Unsere Mission: vertrauenswürdige, effektive Lösungen für eine gesündere Welt zu liefern.</p>
<p>Mit freundlichen Grüßen,<br>Das MediVita-Team</p>
</body>
</html>',
'Willkommen bei MediVita - Gesundheit fürs Leben

Hallo ${firstName},

Ihr Konto wurde erfolgreich erstellt. Bei MediVita spezialisieren wir uns auf innovative Pharmazeutika und verbinden fortschrittliche Wissenschaft mit Leidenschaft für das Wohlbefinden.

Unsere Mission: vertrauenswürdige, effektive Lösungen für eine gesündere Welt zu liefern.

Mit freundlichen Grüßen,
Das MediVita-Team', 'de', 'Willkommens-E-Mail für neue MediVita-Benutzer'),

('welcome', 'Bienvenue sur ERP System',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Bienvenue sur ERP System!</h1>
<p>Bonjour <span th:text="${firstName}">Utilisateur</span>,</p>
<p>Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter et utiliser le système.</p>
<p>Cordialement,<br>L équipe ERP</p>
</body>
</html>',
'Bienvenue sur ERP System!

Bonjour ${firstName},

Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter et utiliser le système.

Cordialement,
L équipe ERP', 'fr', 'Email de bienvenue pour les nouveaux utilisateurs'),

('welcome', 'Добро пожаловать в ERP System',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Добро пожаловать в ERP System!</h1>
<p>Здравствуйте, <span th:text="${firstName}">Пользователь</span>,</p>
<p>Ваша учётная запись успешно создана. Теперь вы можете войти в систему и начать работу.</p>
<p>С уважением,<br>Команда ERP</p>
</body>
</html>',
'Добро пожаловать в ERP System!

Здравствуйте, ${firstName},

Ваша учётная запись успешно создана. Теперь вы можете войти в систему и начать работу.

С уважением,
Команда ERP', 'ru', 'Приветственное письмо для новых пользователей');

-- Password Reset Templates
INSERT INTO email_templates (name, subject, body_html, body_text, language, description) VALUES
('password-reset', 'Password Reset Request',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Password Reset</h1>
<p>You have requested to reset your password. Click the link below to set a new password:</p>
<p><a th:href="${resetUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
<p>If you did not request this, please ignore this email.</p>
<p>This link will expire in 24 hours.</p>
</body>
</html>',
'Password Reset

You have requested to reset your password. Visit the following link to set a new password:
${resetUrl}

If you did not request this, please ignore this email.
This link will expire in 24 hours.', 'en', 'Password reset email'),

('password-reset', 'Passwort zurücksetzen',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Passwort zurücksetzen</h1>
<p>Sie haben das Zurücksetzen Ihres Passworts angefordert. Klicken Sie auf den Link unten, um ein neues Passwort festzulegen:</p>
<p><a th:href="${resetUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Passwort zurücksetzen</a></p>
<p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.</p>
<p>Dieser Link läuft in 24 Stunden ab.</p>
</body>
</html>',
'Passwort zurücksetzen

Sie haben das Zurücksetzen Ihres Passworts angefordert. Besuchen Sie den folgenden Link:
${resetUrl}

Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail.
Dieser Link läuft in 24 Stunden ab.', 'de', 'Passwort-Reset-E-Mail'),

('password-reset', 'Réinitialisation du mot de passe',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Réinitialisation du mot de passe</h1>
<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous:</p>
<p><a th:href="${resetUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Réinitialiser</a></p>
<p>Si vous n avez pas fait cette demande, ignorez cet email.</p>
<p>Ce lien expirera dans 24 heures.</p>
</body>
</html>',
'Réinitialisation du mot de passe

Vous avez demandé la réinitialisation de votre mot de passe. Visitez le lien:
${resetUrl}

Si vous n avez pas fait cette demande, ignorez cet email.
Ce lien expirera dans 24 heures.', 'fr', 'Email de réinitialisation'),

('password-reset', 'Сброс пароля',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Сброс пароля</h1>
<p>Вы запросили сброс пароля. Нажмите на ссылку ниже:</p>
<p><a th:href="${resetUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Сбросить пароль</a></p>
<p>Если вы не делали этот запрос, проигнорируйте это письмо.</p>
<p>Ссылка действительна 24 часа.</p>
</body>
</html>',
'Сброс пароля

Вы запросили сброс пароля. Перейдите по ссылке:
${resetUrl}

Если вы не делали этот запрос, проигнорируйте это письмо.
Ссылка действительна 24 часа.', 'ru', 'Письмо для сброса пароля');

-- Order Confirmation Templates
INSERT INTO email_templates (name, subject, body_html, body_text, language, description) VALUES
('order-confirmation', 'MediVita Order Confirmation #[[${orderId}]]',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #2563eb;">MediVita Order Confirmation</h1>
<p>Thank you for your order!</p>
<p>Order ID: <strong th:text="${orderId}">123</strong></p>
<p>Total: <strong th:text="${orderTotal}">$0.00</strong></p>
<p>At MediVita, we craft health for life. We will notify you when your order ships.</p>
<p>Crafting Health for Life,<br>The MediVita Team</p>
</body>
</html>',
'MediVita Order Confirmation

Thank you for your order!
Order ID: ${orderId}
Total: ${orderTotal}

At MediVita, we craft health for life. We will notify you when your order ships.

Crafting Health for Life,
The MediVita Team', 'en', 'MediVita order confirmation email'),

('order-confirmation', 'Bestellbestätigung #[[${orderId}]]',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Bestellbestätigung</h1>
<p>Vielen Dank für Ihre Bestellung!</p>
<p>Bestellnummer: <strong th:text="${orderId}">123</strong></p>
<p>Gesamtbetrag: <strong th:text="${orderTotal}">0,00 €</strong></p>
<p>Wir informieren Sie, sobald Ihre Bestellung versandt wird.</p>
</body>
</html>',
'Bestellbestätigung

Vielen Dank für Ihre Bestellung!
Bestellnummer: ${orderId}
Gesamtbetrag: ${orderTotal}

Wir informieren Sie, sobald Ihre Bestellung versandt wird.', 'de', 'Bestellbestätigungs-E-Mail'),

('order-confirmation', 'Confirmation de commande #[[${orderId}]]',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Confirmation de commande</h1>
<p>Merci pour votre commande!</p>
<p>Numéro de commande: <strong th:text="${orderId}">123</strong></p>
<p>Total: <strong th:text="${orderTotal}">0,00 €</strong></p>
<p>Nous vous informerons lors de l expédition.</p>
</body>
</html>',
'Confirmation de commande

Merci pour votre commande!
Numéro de commande: ${orderId}
Total: ${orderTotal}

Nous vous informerons lors de l expédition.', 'fr', 'Email de confirmation de commande'),

('order-confirmation', 'Подтверждение заказа #[[${orderId}]]',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #3b82f6;">Подтверждение заказа</h1>
<p>Спасибо за ваш заказ!</p>
<p>Номер заказа: <strong th:text="${orderId}">123</strong></p>
<p>Итого: <strong th:text="${orderTotal}">0 ₽</strong></p>
<p>Мы уведомим вас об отправке.</p>
</body>
</html>',
'Подтверждение заказа

Спасибо за ваш заказ!
Номер заказа: ${orderId}
Итого: ${orderTotal}

Мы уведомим вас об отправке.', 'ru', 'Письмо подтверждения заказа');
