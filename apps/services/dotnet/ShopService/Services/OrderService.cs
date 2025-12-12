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

    public OrderService(
        ShopDbContext context,
        ILogger<OrderService> logger,
        IInventoryService inventoryService,
        ICouponService couponService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _inventoryService = inventoryService;
        _couponService = couponService;
        _configuration = configuration;
    }

    public async Task<Order?> GetByIdAsync(Guid id)
    {
        return await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Include(o => o.ShippingMethod)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<Order?> GetByOrderNumberAsync(string orderNumber)
    {
        return await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
    }

    public async Task<IEnumerable<Order>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Orders
            .Include(o => o.Customer)
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
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Where(o => o.Status == status)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<Order> CreateAsync(CreateOrderInput input)
    {
        var taxRate = _configuration.GetValue<decimal>("Shop:TaxRate", 0.19m);

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
                TaxAmount = itemTotal * taxRate,
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
        if (input.ShippingMethodId.HasValue)
        {
            var shippingMethod = await _context.ShippingMethods.FindAsync(input.ShippingMethodId);
            if (shippingMethod != null)
            {
                shippingAmount = shippingMethod.Price;
                if (shippingMethod.FreeShippingThreshold.HasValue && subtotal >= shippingMethod.FreeShippingThreshold)
                {
                    shippingAmount = 0;
                }
            }
        }

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

        return order;
    }

    public async Task<Order?> UpdateStatusAsync(UpdateOrderStatusInput input)
    {
        var order = await _context.Orders.FindAsync(input.OrderId);
        if (order == null) return null;

        var newStatus = Enum.Parse<OrderStatus>(input.Status);
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

    public async Task<IEnumerable<Order>> GetRecentAsync(int count = 10)
    {
        return await _context.Orders
            .Include(o => o.Customer)
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
}
