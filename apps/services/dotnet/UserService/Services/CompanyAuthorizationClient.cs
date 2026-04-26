using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using UserService.DTOs;
using UserService.Exceptions;

namespace UserService.Services;

public interface ICompanyAuthorizationClient
{
    Task<AuthorizationContextDto> GetAuthorizationContextAsync(Guid userId, Guid companyId, bool isGlobalSuperAdmin, CancellationToken cancellationToken = default);
}

public sealed class CompanyAuthorizationClient : ICompanyAuthorizationClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly CompanyAuthorizationOptions _options;
    private readonly ILogger<CompanyAuthorizationClient> _logger;

    public CompanyAuthorizationClient(
        HttpClient httpClient,
        IOptions<CompanyAuthorizationOptions> options,
        ILogger<CompanyAuthorizationClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AuthorizationContextDto> GetAuthorizationContextAsync(Guid userId, Guid companyId, bool isGlobalSuperAdmin, CancellationToken cancellationToken = default)
    {
        var requestBody = new GraphQlRequest(
            """
            query AuthorizationContext($userId: ID!, $companyId: ID!) {
              authorizationContext(userId: $userId, companyId: $companyId) {
                userId
                companyId
                companyName
                membershipValid
                companyRole
                isGlobalSuperAdmin
                groupCodes
                permissionCodes
                scopeGrants {
                  permissionCode
                  scopeType
                  scopeJson
                }
              }
            }
            """,
            new Dictionary<string, object?>
            {
                ["userId"] = userId,
                ["companyId"] = companyId,
            });

        using var request = new HttpRequestMessage(HttpMethod.Post, "");
        request.Headers.Add("X-Internal-Api-Key", _options.InternalApiKey);
        request.Headers.Add("X-Internal-Is-Global-Super-Admin", isGlobalSuperAdmin.ToString().ToLowerInvariant());
        request.Content = JsonContent.Create(requestBody, options: JsonOptions);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<GraphQlResponse<AuthorizationContextEnvelope>>(JsonOptions, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorMessage = payload?.Errors?.FirstOrDefault()?.Message ?? $"Company authorization service returned HTTP {(int)response.StatusCode}";
            _logger.LogWarning("Authorization context request failed for user {UserId} and company {CompanyId}: {Message}", userId, companyId, errorMessage);
            throw new AuthorizationException("COMPANY_AUTHORIZATION_FAILED", errorMessage);
        }

        if (payload?.Errors is { Length: > 0 })
        {
            throw new AuthorizationException(
                "COMPANY_AUTHORIZATION_FAILED",
                payload.Errors[0].Message ?? "Failed to resolve company authorization context");
        }

        var context = payload?.Data?.AuthorizationContext;
        if (context is null)
        {
            throw new AuthorizationException("COMPANY_AUTHORIZATION_FAILED", "Company authorization service returned an empty context");
        }

        return context;
    }

    public sealed class CompanyAuthorizationOptions
    {
        public string ServiceUrl { get; set; } = "http://company-service:8080/graphql";
        public string InternalApiKey { get; set; } = "erp-internal-auth-key";
    }

    private sealed record GraphQlRequest(string Query, Dictionary<string, object?> Variables);

    private sealed record GraphQlResponse<T>(T? Data, GraphQlError[]? Errors);

    private sealed record GraphQlError(string? Message);

    private sealed record AuthorizationContextEnvelope(AuthorizationContextDto? AuthorizationContext);
}
