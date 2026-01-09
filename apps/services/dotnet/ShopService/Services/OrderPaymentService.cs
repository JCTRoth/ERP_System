using System.Text.Json;
using ShopService.Data;
using ShopService.Models;

namespace ShopService.Services;

/// <summary>
/// Service to handle payment record linking and confirmation for orders
/// </summary>
public interface IOrderPaymentService
{
    Task<bool> LinkPaymentRecordAsync(Guid orderId, Guid paymentRecordId, decimal amount);
    Task<bool> ConfirmPaymentRecordAsync(Guid orderId, Guid paymentRecordId);
    Task<IEnumerable<Guid>> GetLinkedPaymentRecordsAsync(Guid orderId);
}

public class OrderPaymentService : IOrderPaymentService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<OrderPaymentService> _logger;
    private readonly AccountingServiceClient _accountingClient;

    public OrderPaymentService(
        ShopDbContext context,
        ILogger<OrderPaymentService> logger,
        AccountingServiceClient accountingClient)
    {
        _context = context;
        _logger = logger;
        _accountingClient = accountingClient;
    }

    public async Task<bool> LinkPaymentRecordAsync(Guid orderId, Guid paymentRecordId, decimal amount)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for payment linking", orderId);
            return false;
        }

        try
        {
            var paymentIds = GetPaymentRecordIds(order.PaymentRecordIds);
            if (!paymentIds.Contains(paymentRecordId))
            {
                paymentIds.Add(paymentRecordId);
                order.PaymentRecordIds = JsonSerializer.Serialize(paymentIds);
                
                // Update order payment status based on total paid
                var paidAmount = await CalculateTotalPaidAsync(paymentIds);
                if (paidAmount >= order.Total)
                {
                    order.PaymentStatus = PaymentStatus.Paid;
                }
                else if (paidAmount > 0)
                {
                    order.PaymentStatus = PaymentStatus.PartiallyPaid;
                }

                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Linked payment record {PaymentRecordId} to order {OrderNumber} (amount: {Amount})",
                    paymentRecordId, order.OrderNumber, amount);

                return true;
            }

            return true; // Already linked
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error linking payment record {PaymentRecordId} to order {OrderId}",
                paymentRecordId, orderId);
            return false;
        }
    }

    public async Task<bool> ConfirmPaymentRecordAsync(Guid orderId, Guid paymentRecordId)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for payment confirmation", orderId);
            return false;
        }

        try
        {
            // Call Accounting Service to confirm the payment record
            var confirmed = await _accountingClient.ConfirmPaymentRecordAsync(paymentRecordId);

            if (confirmed)
            {
                _logger.LogInformation("Confirmed payment record {PaymentRecordId} for order {OrderNumber}",
                    paymentRecordId, order.OrderNumber);

                // Update order payment status
                var paymentIds = GetPaymentRecordIds(order.PaymentRecordIds);
                var paidAmount = await CalculateTotalPaidAsync(paymentIds);

                if (paidAmount >= order.Total)
                {
                    order.PaymentStatus = PaymentStatus.Paid;
                }
                else if (paidAmount > 0)
                {
                    order.PaymentStatus = PaymentStatus.PartiallyPaid;
                }

                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error confirming payment record {PaymentRecordId} for order {OrderId}",
                paymentRecordId, orderId);
            return false;
        }
    }

    public async Task<IEnumerable<Guid>> GetLinkedPaymentRecordsAsync(Guid orderId)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null || string.IsNullOrEmpty(order.PaymentRecordIds))
        {
            return new List<Guid>();
        }

        return GetPaymentRecordIds(order.PaymentRecordIds);
    }

    private List<Guid> GetPaymentRecordIds(string? json)
    {
        if (string.IsNullOrEmpty(json))
            return new List<Guid>();

        try
        {
            var ids = JsonSerializer.Deserialize<List<Guid>>(json) ?? new List<Guid>();
            return ids;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize payment record IDs JSON");
            return new List<Guid>();
        }
    }

    private async Task<decimal> CalculateTotalPaidAsync(List<Guid> paymentRecordIds)
    {
        if (paymentRecordIds.Count == 0)
            return 0;

        try
        {
            var total = await _accountingClient.GetTotalPaidFromPaymentRecordsAsync(paymentRecordIds);
            return total;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating total paid from payment records");
            return 0;
        }
    }
}
