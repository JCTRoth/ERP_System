using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.Models;

namespace ShopService.Services;

/// <summary>
/// Background job payload for document generation and invoice creation tasks
/// </summary>
public class OrderJobPayload
{
    public Guid OrderId { get; set; }
    public string JobType { get; set; } = "GenerateDocuments"; // GenerateDocuments or CreateInvoice
    public string? State { get; set; } // For GenerateDocuments
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int RetryCount { get; set; } = 0;
    public int MaxRetries { get; set; } = 3;
    public string? LastError { get; set; }
}

/// <summary>
/// Queue-based processor for reliable order document generation and invoice creation
/// </summary>
public interface IOrderJobProcessor
{
    Task EnqueueDocumentGenerationAsync(Guid orderId, string state);
    Task EnqueueInvoiceCreationAsync(Guid orderId);
    Task ProcessPendingJobsAsync(CancellationToken cancellationToken = default);
}

public class OrderJobProcessor : IOrderJobProcessor
{
    private readonly ShopDbContext _context;
    private readonly ILogger<OrderJobProcessor> _logger;
    private readonly TemplatesServiceClient _templatesClient;
    private readonly MinioStorageService _minioStorage;
    private readonly AccountingServiceClient _accountingClient;
    private readonly NotificationServiceClient _notificationClient;

    // In-memory queue (in production, use Hangfire, MassTransit, or Azure Service Bus)
    private readonly Queue<OrderJobPayload> _jobQueue = new Queue<OrderJobPayload>();
    private readonly object _queueLock = new object();

    public OrderJobProcessor(
        ShopDbContext context,
        ILogger<OrderJobProcessor> logger,
        TemplatesServiceClient templatesClient,
        MinioStorageService minioStorage,
        AccountingServiceClient accountingClient,
        NotificationServiceClient notificationClient)
    {
        _context = context;
        _logger = logger;
        _templatesClient = templatesClient;
        _minioStorage = minioStorage;
        _accountingClient = accountingClient;
        _notificationClient = notificationClient;
    }

    public async Task EnqueueDocumentGenerationAsync(Guid orderId, string state)
    {
        var job = new OrderJobPayload
        {
            OrderId = orderId,
            JobType = "GenerateDocuments",
            State = state,
            CreatedAt = DateTime.UtcNow
        };

        lock (_queueLock)
        {
            _jobQueue.Enqueue(job);
        }

        _logger.LogInformation("Enqueued document generation job for order {OrderId} state {State}", orderId, state);
    }

    public async Task EnqueueInvoiceCreationAsync(Guid orderId)
    {
        var job = new OrderJobPayload
        {
            OrderId = orderId,
            JobType = "CreateInvoice",
            CreatedAt = DateTime.UtcNow
        };

        lock (_queueLock)
        {
            _jobQueue.Enqueue(job);
        }

        _logger.LogInformation("Enqueued invoice creation job for order {OrderId}", orderId);
    }

    public async Task ProcessPendingJobsAsync(CancellationToken cancellationToken = default)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            OrderJobPayload? job = null;

            lock (_queueLock)
            {
                if (_jobQueue.Count == 0)
                    break;
                job = _jobQueue.Dequeue();
            }

            if (job == null)
                break;

            try
            {
                if (job.JobType == "GenerateDocuments")
                {
                    await ProcessDocumentGenerationAsync(job);
                }
                else if (job.JobType == "CreateInvoice")
                {
                    await ProcessInvoiceCreationAsync(job);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing job {JobType} for order {OrderId}, retry count: {RetryCount}",
                    job.JobType, job.OrderId, job.RetryCount);

                job.RetryCount++;
                job.LastError = ex.Message;

                if (job.RetryCount < job.MaxRetries)
                {
                    // Re-queue for retry
                    lock (_queueLock)
                    {
                        _jobQueue.Enqueue(job);
                    }
                    _logger.LogInformation("Re-queued job {JobType} for order {OrderId} (retry {RetryCount}/{MaxRetries})",
                        job.JobType, job.OrderId, job.RetryCount, job.MaxRetries);
                }
                else
                {
                    _logger.LogError("Job {JobType} for order {OrderId} failed after {MaxRetries} retries. Error: {Error}",
                        job.JobType, job.OrderId, job.MaxRetries, job.LastError);
                }
            }
        }
    }

    private async Task ProcessDocumentGenerationAsync(OrderJobPayload job)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Documents)
            .FirstOrDefaultAsync(o => o.Id == job.OrderId);

        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for document generation", job.OrderId);
            return;
        }

        var state = job.State ?? "draft";

        try
        {
            var customer = await _context.Customers.FindAsync(order.CustomerId);
            
            var templates = await _templatesClient.GetTemplatesByStateAsync(state, "1");
            
            if (templates == null || !templates.Any())
            {
                _logger.LogInformation("No templates found for order state: {State}", state);
                return;
            }

            foreach (var template in templates)
            {
                try
                {
                    var context = new
                    {
                        invoice = new
                        {
                            id = order.Id.ToString(),
                            number = order.OrderNumber,
                            date = order.CreatedAt.ToString("yyyy-MM-dd"),
                            status = order.Status.ToString(),
                            subtotal = order.Subtotal,
                            tax = order.TaxAmount,
                            shipping = order.ShippingAmount,
                            total = order.Total,
                            currency = order.Currency,
                            notes = order.Notes,
                            items = order.Items.Select((item, index) => new
                            {
                                index = index + 1,
                                description = item.ProductName,
                                quantity = item.Quantity,
                                unitPrice = item.UnitPrice,
                                discount = item.DiscountAmount,
                                total = item.Total
                            }).ToList()
                        },
                        company = new
                        {
                            name = "ERP System Company",
                            address = "123 Business St",
                            city = "Business City",
                            postalCode = "12345",
                            country = "Germany",
                            email = "info@erp-system.com",
                            phone = "+49 123 456789"
                        },
                        customer = new
                        {
                            name = $"{customer?.FirstName} {customer?.LastName}".Trim(),
                            address = new
                            {
                                street = order.ShippingAddress ?? "N/A",
                                city = order.ShippingCity ?? "N/A",
                                postalCode = order.ShippingPostalCode ?? "N/A",
                                country = order.ShippingCountry ?? "N/A"
                            }
                        }
                    };

                    var pdfBytes = await _templatesClient.GeneratePdfAsync(template.Id, context);
                    if (pdfBytes == null || pdfBytes.Length == 0)
                    {
                        _logger.LogWarning("Failed to generate PDF for template {TemplateId}", template.Id);
                        continue;
                    }

                    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
                    var objectKey = $"orders/{order.Id}/{template.Key}-{timestamp}.pdf";
                    var pdfUrl = await _minioStorage.UploadPdfAsync("1", objectKey, pdfBytes);

                    var document = new OrderDocument
                    {
                        Id = Guid.NewGuid(),
                        OrderId = order.Id,
                        DocumentType = template.DocumentType,
                        State = state,
                        PdfUrl = pdfUrl,
                        GeneratedAt = DateTime.UtcNow,
                        TemplateId = template.Id,
                        TemplateKey = template.Key
                    };

                    _context.OrderDocuments.Add(document);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Generated document {DocumentType} for order {OrderNumber}", 
                        template.DocumentType, order.OrderNumber);

                    if (template.SendEmail && customer != null && !string.IsNullOrEmpty(customer.Email))
                    {
                        await _notificationClient.SendOrderStatusEmailAsync(
                            customer.Email,
                            order.OrderNumber,
                            order.Status.ToString(),
                            order.TrackingNumber,
                            pdfUrl);
                        
                        _logger.LogInformation("Sent email notification to {Email} for order {OrderNumber}", 
                            customer.Email, order.OrderNumber);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error generating document from template {TemplateId} for order {OrderId}", 
                        template.Id, order.Id);
                    throw; // Bubble up to retry handler
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessDocumentGenerationAsync for order {OrderId}", order.Id);
            throw;
        }
    }

    private async Task ProcessInvoiceCreationAsync(OrderJobPayload job)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == job.OrderId);

        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for invoice creation", job.OrderId);
            return;
        }

        var customer = await _context.Customers.FindAsync(order.CustomerId);
        if (customer == null)
        {
            _logger.LogWarning("Customer not found for order {OrderNumber}, skipping invoice creation", order.OrderNumber);
            return;
        }

        var lineItems = order.Items.Select(item => new InvoiceLineItemInput
        {
            Description = item.ProductName,
            Sku = item.Sku,
            ProductId = item.ProductId,
            Quantity = item.Quantity,
            Unit = "pcs",
            UnitPrice = item.UnitPrice,
            DiscountAmount = item.DiscountAmount,
            TaxRate = item.TaxAmount > 0 && item.UnitPrice > 0 
                ? (item.TaxAmount / (item.UnitPrice * item.Quantity) * 100) 
                : 0,
            TaxAmount = item.TaxAmount
        }).ToList();

        var result = await _accountingClient.CreateInvoiceFromOrderAsync(
            order.Id,
            order.OrderNumber,
            customer.Id,
            $"{customer.FirstName} {customer.LastName}".Trim(),
            order.Subtotal,
            order.TaxAmount,
            order.Total,
            order.Currency,
            lineItems);

        if (result != null)
        {
            // Store invoice reference on order
            order.InvoiceNumber = result.InvoiceNumber;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created invoice {InvoiceNumber} for order {OrderNumber}", 
                result.InvoiceNumber, order.OrderNumber);
        }
        else
        {
            _logger.LogWarning("Failed to create invoice for order {OrderNumber}", order.OrderNumber);
            throw new InvalidOperationException($"Invoice creation returned null for order {order.OrderNumber}");
        }
    }
}
