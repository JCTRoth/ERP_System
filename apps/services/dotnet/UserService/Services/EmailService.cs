using UserService.Models;
using System.Text.Json;

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
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public EmailService(ILogger<EmailService> logger, HttpClient httpClient, IConfiguration configuration)
    {
        _logger = logger;
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task SendPasswordResetEmailAsync(User user, string resetToken)
    {
        try
        {
            var notificationServiceUrl = _configuration["NotificationService:Url"] ?? "http://notification-service:8082";
            var websiteUrl = _configuration["Website:Url"] ?? "https://shopping-now.net";
            var resetUrl = $"{websiteUrl}/reset-password?token={resetToken}";

            var graphQLRequest = new
            {
                query = @"
                    mutation SendPasswordResetEmail($input: SendEmailInput!) {
                        sendEmail(input: $input) {
                            id
                            toEmail
                            subject
                            status
                        }
                    }",
                variables = new
                {
                    input = new
                    {
                        toEmail = user.Email,
                        toName = user.FirstName,
                        templateName = "password-reset",
                        templateData = new
                        {
                            firstName = user.FirstName,
                            resetUrl = resetUrl,
                            expirationTime = "1 hour"
                        },
                        language = user.PreferredLanguage ?? "en"
                    }
                }
            };

            var json = JsonSerializer.Serialize(graphQLRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{notificationServiceUrl}/graphql", content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Password reset email sent successfully to {Email}", user.Email);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send password reset email to {Email}. Status: {Status}, Response: {Response}",
                    user.Email, response.StatusCode, errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending password reset email to {Email}", user.Email);
        }
    }

    public async Task SendEmailVerificationEmailAsync(User user, string verificationToken)
    {
        try
        {
            var notificationServiceUrl = _configuration["NotificationService:Url"] ?? "http://notification-service:8082";
            var websiteUrl = _configuration["Website:Url"] ?? "https://shopping-now.net";
            var verificationUrl = $"{websiteUrl}/verify-email?token={verificationToken}";

            var graphQLRequest = new
            {
                query = @"
                    mutation SendEmailVerificationEmail($input: SendEmailInput!) {
                        sendEmail(input: $input) {
                            id
                            toEmail
                            subject
                            status
                        }
                    }",
                variables = new
                {
                    input = new
                    {
                        toEmail = user.Email,
                        toName = user.FirstName,
                        templateName = "email-verification",
                        templateData = new
                        {
                            firstName = user.FirstName,
                            verificationUrl = verificationUrl
                        },
                        language = user.PreferredLanguage ?? "en"
                    }
                }
            };

            var json = JsonSerializer.Serialize(graphQLRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{notificationServiceUrl}/graphql", content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email verification email sent successfully to {Email}", user.Email);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send email verification email to {Email}. Status: {Status}, Response: {Response}",
                    user.Email, response.StatusCode, errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email verification email to {Email}", user.Email);
        }
    }

    public async Task SendWelcomeEmailAsync(User user)
    {
        try
        {
            var notificationServiceUrl = _configuration["NotificationService:Url"] ?? "http://notification-service:8082";
            var websiteUrl = _configuration["Website:Url"] ?? "https://shopping-now.net";

            var graphQLRequest = new
            {
                query = @"
                    mutation SendWelcomeEmail($input: SendEmailInput!) {
                        sendEmail(input: $input) {
                            id
                            toEmail
                            subject
                            status
                        }
                    }",
                variables = new
                {
                    input = new
                    {
                        toEmail = user.Email,
                        toName = user.FirstName,
                        templateName = "welcome",
                        templateData = new
                        {
                            firstName = user.FirstName,
                            websiteUrl = websiteUrl
                        },
                        language = user.PreferredLanguage ?? "en"
                    }
                }
            };

            var json = JsonSerializer.Serialize(graphQLRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{notificationServiceUrl}/graphql", content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Welcome email sent successfully to {Email}", user.Email);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send welcome email to {Email}. Status: {Status}, Response: {Response}",
                    user.Email, response.StatusCode, errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending welcome email to {Email}", user.Email);
        }
    }
}