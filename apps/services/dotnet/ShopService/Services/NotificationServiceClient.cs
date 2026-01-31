using System.Text;
using System.Text.Json;

namespace ShopService.Services;

/// <summary>
/// GraphQL client for Notification Service (Java)
/// </summary>
public class NotificationServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<NotificationServiceClient> _logger;

    public NotificationServiceClient(HttpClient httpClient, ILogger<NotificationServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Send email notification using Notification Service GraphQL API.
    /// Uses the SendEmailInput schema from notification-service.
    /// </summary>
    public async Task<bool> SendEmailAsync(
        string toEmail,
        string subject,
        string? bodyHtml = null,
        string? bodyText = null,
        string? templateName = null,
        object? templateData = null,
        string? language = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var mutation = @"
                mutation SendEmail($input: SendEmailInput!) {
                    sendEmail(input: $input) {
                        id
                        status
                    }
                }";

            var variables = new
            {
                input = new
                {
                    toEmail = toEmail,
                    toName = (string?)null,
                    subject,
                    templateName = templateName,
                    templateData = templateData,
                    bodyHtml = bodyHtml,
                    bodyText = bodyText,
                    language = language
                }
            };

            var request = new
            {
                query = mutation,
                variables
            };

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/graphql", content, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Error sending email: {StatusCode} - {Error}", response.StatusCode, errorContent);
                return false;
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<SendEmailResponse>>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogError("GraphQL errors sending email: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return false;
            }

            // Consider the operation successful if an EmailNotification object is returned
            return result?.Data?.SendEmail != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to: {Email}", toEmail);
            return false;
        }
    }

    /// <summary>
    /// Send order status change notification
    /// </summary>
    public async Task<bool> SendOrderStatusEmailAsync(
        string customerEmail,
        string orderNumber,
        string status,
        string? trackingNumber = null,
        string? pdfUrl = null,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Order {orderNumber} - Status Update: {status}";
        var bodyHtml = GenerateOrderStatusEmailBody(orderNumber, status, trackingNumber, pdfUrl);
        
        return await SendEmailAsync(
            customerEmail,
            subject,
            bodyHtml: bodyHtml,
            bodyText: null,
            templateName: "order-confirmation",
            templateData: new
            {
                orderId = orderNumber,
                orderTotal = (string?)null,
                documentUrl = pdfUrl
            },
            language: "en",
            cancellationToken);
    }

    private string GenerateOrderStatusEmailBody(string orderNumber, string status, string? trackingNumber, string? pdfUrl)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"<h2>Order {orderNumber} Update</h2>");
        sb.AppendLine($"<p>Your order status has been updated to: <strong>{status}</strong></p>");
        
        if (!string.IsNullOrEmpty(trackingNumber))
        {
            sb.AppendLine($"<p>Tracking Number: <strong>{trackingNumber}</strong></p>");
        }

        if (!string.IsNullOrEmpty(pdfUrl))
        {
            sb.AppendLine($"<p>You can download your document here: <a href=\"{pdfUrl}\">Download PDF</a></p>");
        }

        sb.AppendLine("<p>Thank you for your business!</p>");
        
        return sb.ToString();
    }
}

public class SendEmailResponse
{
    public EmailNotificationPayload? SendEmail { get; set; }
}

public class EmailNotificationPayload
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
