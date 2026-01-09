using System.Text;
using System.Text.Json;

namespace ShopService.Services;

/// <summary>
/// HTTP client for Templates Service (Node.js)
/// </summary>
public class TemplatesServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TemplatesServiceClient> _logger;

    public TemplatesServiceClient(HttpClient httpClient, ILogger<TemplatesServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Get templates by assigned state
    /// </summary>
    public async Task<List<TemplateDto>> GetTemplatesByStateAsync(string state, string? companyId = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var url = $"/api/templates?assignedState={state}";
            if (!string.IsNullOrEmpty(companyId))
            {
                url += $"&companyId={companyId}";
            }

            var response = await _httpClient.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var templates = JsonSerializer.Deserialize<List<TemplateDto>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return templates ?? new List<TemplateDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching templates by state: {State}", state);
            return new List<TemplateDto>();
        }
    }

    /// <summary>
    /// Generate PDF from template
    /// </summary>
    public async Task<byte[]?> GeneratePdfAsync(string templateId, object context, CancellationToken cancellationToken = default)
    {
        try
        {
            var jsonContext = JsonSerializer.Serialize(context, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var requestContent = new StringContent(jsonContext, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"/api/templates/{templateId}/pdf", requestContent, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Error generating PDF from template {TemplateId}: {StatusCode} - {Error}", 
                    templateId, response.StatusCode, errorContent);
                return null;
            }

            var contentType = response.Content.Headers.ContentType?.MediaType;
            if (contentType == "application/pdf")
            {
                return await response.Content.ReadAsByteArrayAsync(cancellationToken);
            }
            else
            {
                _logger.LogWarning("Template service returned {ContentType} instead of PDF for template {TemplateId}", 
                    contentType, templateId);
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF from template: {TemplateId}", templateId);
            return null;
        }
    }
}

/// <summary>
/// DTO for template from templates service
/// </summary>
public class TemplateDto
{
    public string Id { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string? AssignedState { get; set; }
    public string MainObjectType { get; set; } = "order";
    public bool IsActive { get; set; }
    public bool SendEmail { get; set; }
}
