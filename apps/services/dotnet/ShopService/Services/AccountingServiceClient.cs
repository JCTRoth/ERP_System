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
                    invoiceDate = DateTime.UtcNow,
                    dueDate = DateTime.UtcNow.AddDays(30),
                    taxRate = taxAmount > 0 && subtotal > 0 ? (taxAmount / subtotal) : 0,
                    currency,
                    lineItems = lineItems.Select(li => new
                    {
                        description = li.Description,
                        sku = li.Sku,
                        productId = li.ProductId,
                        quantity = li.Quantity,
                        unit = li.Unit,
                        unitPrice = li.UnitPrice,
                        discountPercent = li.DiscountAmount > 0 && li.UnitPrice > 0 
                            ? (li.DiscountAmount / (li.UnitPrice * li.Quantity) * 100) 
                            : 0,
                        taxRate = li.TaxRate
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

    /// <summary>
    /// Confirm a payment record (mark as confirmed in Accounting)
    /// </summary>
    public async Task<bool> ConfirmPaymentRecordAsync(Guid paymentRecordId, CancellationToken cancellationToken = default)
    {
        try
        {
            var mutation = @"
                mutation ConfirmPaymentRecord($input: ConfirmPaymentRecordInput!) {
                    confirmPaymentRecord(input: $input) {
                        id
                        status
                    }
                }";

            var variables = new
            {
                input = new
                {
                    paymentRecordId
                }
            };

            var request = new { query = mutation, variables };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/graphql", content, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<ConfirmPaymentRecordData>>(json);

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogError("GraphQL errors confirming payment record: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return false;
            }

            return result?.Data?.ConfirmPaymentRecord?.Status == "Confirmed";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error confirming payment record: {PaymentRecordId}", paymentRecordId);
            return false;
        }
    }

    /// <summary>
    /// Get total amount paid from multiple payment records
    /// </summary>
    public async Task<decimal> GetTotalPaidFromPaymentRecordsAsync(List<Guid> paymentRecordIds, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = @"
                query GetPaymentRecordsTotalAmount($ids: [UUID!]!) {
                    paymentRecords(filter: { ids: $ids }) {
                        totalAmount
                    }
                }";

            var variables = new
            {
                ids = paymentRecordIds
            };

            var request = new { query, variables };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/graphql", content, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<GetPaymentRecordsTotalData>>(json);

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogWarning("GraphQL errors getting payment total: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return 0;
            }

            return result?.Data?.PaymentRecords?.TotalAmount ?? 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting total paid from payment records");
            return 0;
        }
    }

    /// <summary>
    /// Get an invoice by its invoice number from the accounting service
    /// </summary>
    public async Task<AccountingInvoiceSummary?> GetInvoiceByNumberAsync(
        string invoiceNumber,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = @"
                query GetInvoiceByNumber($invoiceNumber: String!) {
                    invoiceByNumber(invoiceNumber: $invoiceNumber) {
                        id
                        invoiceNumber
                        status
                    }
                }";

            var variables = new { invoiceNumber };
            var request = new { query, variables };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/graphql", content, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<GetInvoiceByNumberData>>(json);

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogWarning("GraphQL errors getting invoice by number: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return null;
            }

            return result?.Data?.InvoiceByNumber;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by number: {InvoiceNumber}", invoiceNumber);
            return null;
        }
    }

    /// <summary>
    /// Create a payment record in the accounting service and (optionally) link it to an invoice
    /// </summary>
    public async Task<CreatedPaymentRecord?> CreatePaymentRecordAsync(
        string type,
        Guid? invoiceId,
        Guid? bankAccountId,
        Guid? accountId,
        string method,
        decimal amount,
        string currency,
        DateTime paymentDate,
        string? reference,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var mutation = @"
                mutation CreatePaymentRecord($input: CreatePaymentRecordInput!) {
                    createPaymentRecord(input: $input) {
                        id
                        status
                        invoiceId
                    }
                }";

            var input = new
            {
                type,
                invoiceId,
                bankAccountId,
                accountId,
                method,
                amount,
                currency,
                paymentDate,
                reference,
                payerName = (string?)null,
                payeeName = (string?)null,
                payerIban = (string?)null,
                payeeIban = (string?)null,
                notes,
                paymentMethod = (string?)null,
                referenceNumber = (string?)null
            };

            var request = new { query = mutation, variables = new { input } };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/graphql", content, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GraphQLResponse<CreatePaymentRecordData>>(json);

            if (result?.Errors != null && result.Errors.Length > 0)
            {
                _logger.LogError("GraphQL errors creating payment record: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Message)));
                return null;
            }

            return result?.Data?.CreatePaymentRecord;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment record for invoice {InvoiceId}", invoiceId);
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

public class AccountingInvoiceSummary
{
    public string Id { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class GetInvoiceByNumberData
{
    public AccountingInvoiceSummary InvoiceByNumber { get; set; } = new();
}

public class ConfirmPaymentRecordData
{
    public ConfirmPaymentRecordResult ConfirmPaymentRecord { get; set; } = new();
}

public class ConfirmPaymentRecordResult
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class GetPaymentRecordsTotalData
{
    public PaymentRecordsTotalResult PaymentRecords { get; set; } = new();
}

public class PaymentRecordsTotalResult
{
    public decimal TotalAmount { get; set; }
}

public class CreatedPaymentRecord
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? InvoiceId { get; set; }
}

public class CreatePaymentRecordData
{
    public CreatedPaymentRecord CreatePaymentRecord { get; set; } = new();
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
