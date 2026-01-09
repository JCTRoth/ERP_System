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
    /// Send email notification with optional PDF attachment
    /// </summary>
    public async Task<bool> SendEmailAsync(
        string toEmail,
        string subject,
        string body,
        string? pdfUrl = null,
        string? pdfFileName = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var mutation = @"
                mutation SendEmail($input: SendEmailInput!) {
                    sendEmail(input: $input)
                }";

            var variables = new
            {
                input = new
                {
                    to = toEmail,
                    subject,
                    body,
                    attachmentUrl = pdfUrl,
                    attachmentName = pdfFileName
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
            var result = JsonSerializer.Deserialize<GraphQLResponse<SendEmailData>>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogError("GraphQL errors sending email: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return false;
            }

            return result?.Data?.SendEmail ?? false;
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
        var body = GenerateOrderStatusEmailBody(orderNumber, status, trackingNumber);
        
        return await SendEmailAsync(
            customerEmail,
            subject,
            body,
            pdfUrl,
            $"order-{orderNumber}-{status.ToLower()}.pdf",
            cancellationToken);
    }

    private string GenerateOrderStatusEmailBody(string orderNumber, string status, string? trackingNumber)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"<h2>Order {orderNumber} Update</h2>");
        sb.AppendLine($"<p>Your order status has been updated to: <strong>{status}</strong></p>");
        
        if (!string.IsNullOrEmpty(trackingNumber))
        {
            sb.AppendLine($"<p>Tracking Number: <strong>{trackingNumber}</strong></p>");
        }

        sb.AppendLine("<p>Thank you for your business!</p>");
        
        return sb.ToString();
    }
}

public class SendEmailData
{
    public bool SendEmail { get; set; }
}
