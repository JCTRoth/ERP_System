using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IOrderService
{
    Task<Order?> GetByIdAsync(Guid id);
    Task<Order?> GetByOrderNumberAsync(string orderNumber);
    Task<IEnumerable<Order>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId);
    Task<IEnumerable<Order>> GetByStatusAsync(OrderStatus status);
    Task<Order> CreateAsync(CreateOrderInput input);
    Task<Order?> UpdateStatusAsync(UpdateOrderStatusInput input);
    Task<bool> CancelAsync(Guid orderId, string? reason);
    Task<bool> DeleteAsync(Guid orderId);
    Task<IEnumerable<Order>> GetRecentAsync(int count = 10);
    Task<decimal> GetTotalRevenueAsync(DateTime? from, DateTime? to);
    Task<int> GetOrderCountAsync(DateTime? from, DateTime? to);
}

public class OrderService : IOrderService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<OrderService> _logger;
    private readonly IInventoryService _inventoryService;
    private readonly ICouponService _couponService;
    private readonly IConfiguration _configuration;
    private readonly IAuditService _auditService;
    private readonly TemplatesServiceClient _templatesClient;
    private readonly MinioStorageService _minioStorage;
    private readonly AccountingServiceClient _accountingClient;
    private readonly NotificationServiceClient _notificationClient;

    public OrderService(
        ShopDbContext context,
        ILogger<OrderService> logger,
        IInventoryService inventoryService,
        ICouponService couponService,
        IConfiguration configuration,
        IAuditService auditService,
        TemplatesServiceClient templatesClient,
        MinioStorageService minioStorage,
        AccountingServiceClient accountingClient,
        NotificationServiceClient notificationClient)
    {
        _context = context;
        _logger = logger;
        _inventoryService = inventoryService;
        _couponService = couponService;
        _configuration = configuration;
        _auditService = auditService;
        _templatesClient = templatesClient;
        _minioStorage = minioStorage;
        _accountingClient = accountingClient;
        _notificationClient = notificationClient;
    }

    public async Task<Order?> GetByIdAsync(Guid id)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Include(o => o.ShippingMethod)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<Order?> GetByOrderNumberAsync(string orderNumber)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
    }

    public async Task<IEnumerable<Order>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetByStatusAsync(OrderStatus status)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.Status == status)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<Order> CreateAsync(CreateOrderInput input)
    {
        // Use provided tax rate or default from configuration
        var taxRate = input.TaxRate ?? _configuration.GetValue<decimal>("Shop:TaxRate", 0.19m);

        // Generate order number
        var orderNumber = await GenerateOrderNumberAsync();

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            CustomerId = input.CustomerId,
            Status = OrderStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            Notes = input.Notes,
            ShippingName = input.ShippingName,
            ShippingAddress = input.ShippingAddress,
            ShippingCity = input.ShippingCity,
            ShippingPostalCode = input.ShippingPostalCode,
            ShippingCountry = input.ShippingCountry,
            ShippingPhone = input.ShippingPhone,
            BillingName = input.BillingName,
            BillingAddress = input.BillingAddress,
            BillingCity = input.BillingCity,
            BillingPostalCode = input.BillingPostalCode,
            BillingCountry = input.BillingCountry,
            ShippingMethodId = input.ShippingMethodId,
            CreatedAt = DateTime.UtcNow
        };

        decimal subtotal = 0;

        // Add order items
        foreach (var itemInput in input.Items)
        {
            var product = await _context.Products.FindAsync(itemInput.ProductId);
            if (product == null)
                throw new InvalidOperationException($"Product {itemInput.ProductId} not found");

            var unitPrice = product.Price;
            var itemTotal = unitPrice * itemInput.Quantity;

            var orderItem = new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = itemInput.ProductId,
                VariantId = itemInput.VariantId,
                ProductName = product.Name,
                Sku = product.Sku,
                Quantity = itemInput.Quantity,
                UnitPrice = unitPrice,
                Total = itemTotal,
                CreatedAt = DateTime.UtcNow
            };

            order.Items.Add(orderItem);
            subtotal += itemTotal;

            // Reserve inventory
            await _inventoryService.AdjustAsync(new InventoryAdjustmentInput(
                itemInput.ProductId,
                itemInput.VariantId,
                -itemInput.Quantity,
                "Sale",
                $"Order {orderNumber}",
                orderNumber
            ));
        }

        // Calculate shipping
        decimal shippingAmount = 0;
        // if (input.ShippingMethodId.HasValue)
        // {
        //     var shippingMethod = await _context.ShippingMethods.FindAsync(input.ShippingMethodId);
        //     if (shippingMethod != null)
        //     {
        //         shippingAmount = shippingMethod.Price;
        //         if (shippingMethod.FreeShippingThreshold.HasValue && subtotal >= shippingMethod.FreeShippingThreshold)
        //         {
        //             shippingAmount = 0;
        //         }
        //     }
        // }

        // Apply coupon
        decimal discountAmount = 0;
        if (!string.IsNullOrEmpty(input.CouponCode))
        {
            var discount = await _couponService.ApplyCouponAsync(input.CouponCode, subtotal, input.CustomerId);
            if (discount.HasValue)
            {
                discountAmount = discount.Value;
            }
        }

        // Calculate totals
        order.Subtotal = subtotal;
        order.TaxAmount = subtotal * taxRate;
        order.ShippingAmount = shippingAmount;
        order.DiscountAmount = discountAmount;
        order.Total = subtotal + order.TaxAmount + shippingAmount - discountAmount;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Order created: {OrderNumber} - Total: {Total}", orderNumber, order.Total);

        // Log audit trail
        await _auditService.LogActionAsync(
            order.Id,
            "Order",
            "Create",
            Guid.Parse("00000000-0000-0000-0000-000000000001"), // System user ID (should come from context)
            null,
            "System",
            null,
            $"Order created with {order.Items.Count} items, Total: {order.Total}",
            $"Order {orderNumber} created"
        );

        return order;
    }

    public async Task<Order?> UpdateStatusAsync(UpdateOrderStatusInput input)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .Include(o => o.Documents)
            .FirstOrDefaultAsync(o => o.Id == input.OrderId);
            
        if (order == null) return null;

        var newStatus = Enum.Parse<OrderStatus>(input.Status, true); // case-insensitive parsing
        var oldStatus = order.Status;

        order.Status = newStatus;
        if (!string.IsNullOrEmpty(input.TrackingNumber))
            order.TrackingNumber = input.TrackingNumber;
        if (!string.IsNullOrEmpty(input.InternalNotes))
            order.InternalNotes = input.InternalNotes;

        if (newStatus == OrderStatus.Shipped && oldStatus != OrderStatus.Shipped)
        {
            order.ShippedAt = DateTime.UtcNow;
        }

        if (newStatus == OrderStatus.Delivered && oldStatus != OrderStatus.Delivered)
        {
            order.DeliveredAt = DateTime.UtcNow;
        }

        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Order {OrderNumber} status updated: {OldStatus} -> {NewStatus}",
            order.OrderNumber, oldStatus, newStatus);

        // Log audit trail
        await _auditService.LogActionAsync(
            order.Id,
            "Order",
            "StatusChange",
            Guid.Parse("00000000-0000-0000-0000-000000000001"), // System user ID
            null,
            "System",
            oldStatus.ToString(),
            newStatus.ToString(),
            $"Order status changed from {oldStatus} to {newStatus}"
        );

        // Generate documents for this state (async - fire and forget)
        _ = Task.Run(async () => await GenerateOrderDocumentsAsync(order, newStatus.ToString().ToLower()));

        // Create invoice when order is confirmed
        if (newStatus == OrderStatus.Confirmed && oldStatus != OrderStatus.Confirmed)
        {
            _ = Task.Run(async () => await CreateInvoiceForOrderAsync(order));
        }

        return order;
    }

    public async Task<bool> CancelAsync(Guid orderId, string? reason)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return false;

        if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Delivered)
        {
            _logger.LogWarning("Cannot cancel order {OrderNumber} - already shipped/delivered", order.OrderNumber);
            return false;
        }

        order.Status = OrderStatus.Cancelled;
        order.InternalNotes = $"{order.InternalNotes}\nCancelled: {reason}";
        order.UpdatedAt = DateTime.UtcNow;

        // Return inventory
        foreach (var item in order.Items)
        {
            await _inventoryService.AdjustAsync(new InventoryAdjustmentInput(
                item.ProductId,
                item.VariantId,
                item.Quantity,
                "Return",
                $"Order {order.OrderNumber} cancelled",
                order.OrderNumber
            ));
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Order {OrderNumber} cancelled: {Reason}", order.OrderNumber, reason);

        return true;
    }

    public async Task<bool> DeleteAsync(Guid orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return false;

        // Can only delete orders that are not shipped or delivered
        if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Delivered)
        {
            _logger.LogWarning("Cannot delete order {OrderNumber} - already shipped/delivered", order.OrderNumber);
            return false;
        }

        // Return inventory before deletion
        foreach (var item in order.Items)
        {
            await _inventoryService.AdjustAsync(new InventoryAdjustmentInput(
                item.ProductId,
                item.VariantId,
                item.Quantity,
                "Return",
                $"Order {order.OrderNumber} deleted",
                order.OrderNumber
            ));
        }

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Order {OrderNumber} deleted", order.OrderNumber);

        // Log audit trail
        await _auditService.LogActionAsync(
            orderId,
            "Order",
            "Delete",
            Guid.Parse("00000000-0000-0000-0000-000000000001"), // System user ID
            null,
            "System",
            $"Order {order.OrderNumber}",
            null,
            $"Order {order.OrderNumber} deleted"
        );

        return true;
    }

    public async Task<IEnumerable<Order>> GetRecentAsync(int count = 10)
    {
        return await _context.Orders
            .OrderByDescending(o => o.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalRevenueAsync(DateTime? from, DateTime? to)
    {
        var query = _context.Orders.AsQueryable();

        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(o => o.CreatedAt <= to.Value);

        query = query.Where(o => o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Refunded);

        return await query.SumAsync(o => o.Total);
    }

    public async Task<int> GetOrderCountAsync(DateTime? from, DateTime? to)
    {
        var query = _context.Orders.AsQueryable();

        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(o => o.CreatedAt <= to.Value);

        return await query.CountAsync();
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var date = DateTime.UtcNow;
        var prefix = $"ORD-{date:yyyyMMdd}";

        var lastOrder = await _context.Orders
            .Where(o => o.OrderNumber.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastOrder != null)
        {
            var lastSequence = lastOrder.OrderNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSequence, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"{prefix}-{sequence:D4}";
    }

    /// <summary>
    /// Generate PDF documents for order based on templates assigned to the state
    /// </summary>
    private async Task GenerateOrderDocumentsAsync(Order order, string state)
    {
        try
        {
            // Get customer email for notifications
            var customer = await _context.Customers.FindAsync(order.CustomerId);
            
            // Fetch templates for this state
            var templates = await _templatesClient.GetTemplatesByStateAsync(state, "1"); // Company ID "1"
            
            if (templates == null || !templates.Any())
            {
                _logger.LogInformation("No templates found for order state: {State}", state);
                return;
            }

            foreach (var template in templates)
            {
                try
                {
                    // Build context for template rendering
                    var context = new
                    {
                        order = new
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
                            trackingNumber = order.TrackingNumber,
                            items = order.Items.Select(item => new
                            {
                                productName = item.ProductName,
                                sku = item.Sku,
                                quantity = item.Quantity,
                                unitPrice = item.UnitPrice,
                                discountAmount = item.DiscountAmount,
                                taxAmount = item.TaxAmount,
                                total = item.Total
                            }).ToList(),
                            shippingAddress = new
                            {
                                name = order.ShippingName ?? "N/A",
                                street = order.ShippingAddress ?? "N/A",
                                city = order.ShippingCity ?? "N/A",
                                postalCode = order.ShippingPostalCode ?? "N/A",
                                country = order.ShippingCountry ?? "N/A",
                                phone = order.ShippingPhone
                            },
                            billingAddress = new
                            {
                                name = order.BillingName ?? order.ShippingName ?? "N/A",
                                street = order.BillingAddress ?? order.ShippingAddress ?? "N/A",
                                city = order.BillingCity ?? order.ShippingCity ?? "N/A",
                                postalCode = order.BillingPostalCode ?? order.ShippingPostalCode ?? "N/A",
                                country = order.BillingCountry ?? order.ShippingCountry ?? "N/A"
                            },
                            shipment = new
                            {
                                number = order.TrackingNumber ?? "TBD",
                                date = order.ShippedAt?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                                carrier = "Standard Shipping",
                                trackingNumber = order.TrackingNumber ?? "TBD",
                                notes = ""
                            }
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
                            email = customer?.Email ?? "customer@example.com",
                            name = $"{customer?.FirstName} {customer?.LastName}".Trim(),
                            company = customer?.Company
                        }
                    };

                    // Generate PDF
                    var pdfBytes = await _templatesClient.GeneratePdfAsync(template.Id, context);
                    if (pdfBytes == null || pdfBytes.Length == 0)
                    {
                        _logger.LogWarning("Failed to generate PDF for template {TemplateId}", template.Id);
                        continue;
                    }

                    // Upload to MinIO
                    var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
                    var objectKey = $"orders/{order.Id}/{template.Key}-{timestamp}.pdf";
                    var pdfUrl = await _minioStorage.UploadPdfAsync("1", objectKey, pdfBytes); // Company ID "1"

                    // Save document record
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

                    // Send email if template configured to send
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
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GenerateOrderDocumentsAsync for order {OrderId}", order.Id);
        }
    }

    /// <summary>
    /// Create invoice automatically when order is confirmed
    /// </summary>
    private async Task CreateInvoiceForOrderAsync(Order order)
    {
        try
        {
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
                _logger.LogInformation("Created invoice {InvoiceNumber} for order {OrderNumber}", 
                    result.InvoiceNumber, order.OrderNumber);
            }
            else
            {
                _logger.LogWarning("Failed to create invoice for order {OrderNumber}", order.OrderNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice for order {OrderId}", order.Id);
        }
    }
}
