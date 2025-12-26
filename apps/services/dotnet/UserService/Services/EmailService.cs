using UserService.Models;

namespace UserService.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(User user, string resetToken);
    Task SendEmailVerificationEmailAsync(User user, string verificationToken);
    Task SendWelcomeEmailAsync(User user);
}

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(User user, string resetToken)
    {
        // TODO: Implement actual email sending
        // For now, just log the email content
        var subject = "Password Reset Request";
        var body = $@"
Hello {user.FirstName},

You have requested to reset your password for your ERP System account.

Please use the following token to reset your password: {resetToken}

This token will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
ERP System Team
";

        _logger.LogInformation("Password reset email would be sent to {Email} with token: {Token}", user.Email, resetToken);

        // In production, you would use an email service like SendGrid, Mailgun, etc.
        // Example with SendGrid:
        // var client = new SendGridClient(_sendGridApiKey);
        // var msg = new SendGridMessage()
        // {
        //     From = new EmailAddress("noreply@erp-system.com", "ERP System"),
        //     Subject = subject,
        //     PlainTextContent = body,
        //     HtmlContent = body.Replace("\n", "<br>")
        // };
        // msg.AddTo(new EmailAddress(user.Email, user.FullName));
        // await client.SendEmailAsync(msg);
    }

    public async Task SendEmailVerificationEmailAsync(User user, string verificationToken)
    {
        // TODO: Implement actual email sending
        var subject = "Email Verification";
        var body = $@"
Hello {user.FirstName},

Thank you for registering with the ERP System.

Please verify your email address by using the following token: {verificationToken}

If you did not create this account, please ignore this email.

Best regards,
ERP System Team
";

        _logger.LogInformation("Email verification email would be sent to {Email} with token: {Token}", user.Email, verificationToken);
    }

    public async Task SendWelcomeEmailAsync(User user)
    {
        // TODO: Implement actual email sending
        var subject = "Welcome to ERP System";
        var body = $@"
Hello {user.FirstName},

Welcome to the ERP System! Your account has been successfully created.

You can now log in to your account using your email address.

Best regards,
ERP System Team
";

        _logger.LogInformation("Welcome email would be sent to {Email}", user.Email);
    }
}