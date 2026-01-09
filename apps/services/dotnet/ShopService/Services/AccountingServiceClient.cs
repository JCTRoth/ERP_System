using System.Text;
using System.Text.Json;

namespace ShopService.Services;

/// <summary>
/// GraphQL client for Accounting Service
/// </summary>
public class AccountingServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AccountingServiceClient> _logger;

    public AccountingServiceClient(HttpClient httpClient, ILogger<AccountingServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Create invoice from order
    /// </summary>
    public async Task<CreateInvoiceResult?> CreateInvoiceFromOrderAsync(
        Guid orderId,
        string orderNumber,
        Guid customerId,
        string customerName,
        decimal subtotal,
        decimal taxAmount,
        decimal total,
        string currency,
        List<InvoiceLineItemInput> lineItems,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var mutation = @"
                mutation CreateInvoice($input: CreateInvoiceInput!) {
                    createInvoice(input: $input) {
                        id
                        invoiceNumber
                        status
                    }
                }";

            var variables = new
            {
                input = new
                {
                    type = "SalesInvoice",
                    customerId,
                    orderId,
                    orderNumber,
                    customerName,
                    issueDate = DateTime.UtcNow,
                    dueDate = DateTime.UtcNow.AddDays(30),
                    taxRate = taxAmount > 0 && subtotal > 0 ? (taxAmount / subtotal * 100) : 0,
                    currency,
                    lineItems = lineItems.Select(li => new
                    {
                        description = li.Description,
                        sku = li.Sku,
                        productId = li.ProductId,
                        quantity = li.Quantity,
                        unit = li.Unit,
                        unitPrice = li.UnitPrice,
                        discountAmount = li.DiscountAmount,
                        taxRate = li.TaxRate,
                        taxAmount = li.TaxAmount
                    }).ToList()
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
                _logger.LogError("Error creating invoice: {StatusCode} - {Error}", response.StatusCode, errorContent);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<CreateInvoiceData>>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogError("GraphQL errors creating invoice: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return null;
            }

            return result?.Data?.CreateInvoice;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice from order: {OrderId}", orderId);
            return null;
        }
    }
}

public class InvoiceLineItemInput
{
    public string Description { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public Guid? ProductId { get; set; }
    public int Quantity { get; set; }
    public string Unit { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
}

public class CreateInvoiceResult
{
    public string Id { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class CreateInvoiceData
{
    public CreateInvoiceResult CreateInvoice { get; set; } = new();
}

public class GraphQLResponse<T>
{
    public T? Data { get; set; }
    public GraphQLError[]? Errors { get; set; }
}

public class GraphQLError
{
    public string Message { get; set; } = string.Empty;
}
