using System.Text.Json;
using ShopService.Data;
using ShopService.Models;

namespace ShopService.Services;

/// <summary>
/// Service to handle payment record linking and confirmation for orders
/// </summary>
public interface IOrderPaymentService
{
    Task<bool> LinkPaymentRecordAsync(Guid orderId, Guid paymentRecordId, Guid? paymentId, decimal amount);
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

    public async Task<bool> LinkPaymentRecordAsync(Guid orderId, Guid paymentRecordId, Guid? paymentId, decimal amount)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for payment linking", orderId);
            return false;
        }

        try
        {
            var paymentLinks = PaymentRecordLinkSerializer.Deserialize(order.PaymentRecordIds, _logger);

            if (paymentLinks.Any(link => link.PaymentRecordId == paymentRecordId))
            {
                _logger.LogDebug("Payment record {PaymentRecordId} already linked to order {OrderNumber}",
                    paymentRecordId, order.OrderNumber);
                return true;
            }

            if (paymentId.HasValue && paymentLinks.Any(link => link.PaymentId == paymentId.Value))
            {
                _logger.LogInformation(
                    "Payment {PaymentId} already linked to order {OrderNumber}, skipping duplicate accounting sync",
                    paymentId, order.OrderNumber);
                return true;
            }

            paymentLinks.Add(new PaymentRecordLink
            {
                PaymentRecordId = paymentRecordId,
                PaymentId = paymentId
            });

            order.PaymentRecordIds = PaymentRecordLinkSerializer.Serialize(paymentLinks);

            // Update order payment status based on total paid
            var paidAmount = await CalculateTotalPaidAsync(paymentLinks.Select(link => link.PaymentRecordId).ToList());
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
                var paymentLinks = PaymentRecordLinkSerializer.Deserialize(order.PaymentRecordIds, _logger);
                var paidAmount = await CalculateTotalPaidAsync(paymentLinks.Select(link => link.PaymentRecordId).ToList());

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

        var links = PaymentRecordLinkSerializer.Deserialize(order.PaymentRecordIds, _logger);
        return links.Select(link => link.PaymentRecordId).ToList();
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

internal class PaymentRecordLink
{
    public Guid PaymentRecordId { get; set; }
    public Guid? PaymentId { get; set; }
}

internal static class PaymentRecordLinkSerializer
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static List<PaymentRecordLink> Deserialize(string? json, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<PaymentRecordLink>();
        }

        try
        {
            var links = JsonSerializer.Deserialize<List<PaymentRecordLink>>(json, SerializerOptions);
            if (links != null)
            {
                return links.Where(link => link.PaymentRecordId != Guid.Empty).ToList();
            }
        }
        catch (JsonException ex)
        {
            logger.LogDebug(ex,
                "Payment record links stored on the order are not in the enriched format, falling back to legacy GUID array");
        }

        try
        {
            var legacyIds = JsonSerializer.Deserialize<List<Guid>>(json);
            if (legacyIds != null)
            {
                return legacyIds
                    .Where(id => id != Guid.Empty)
                    .Select(id => new PaymentRecordLink { PaymentRecordId = id })
                    .ToList();
            }
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to deserialize payment record references");
        }

        return new List<PaymentRecordLink>();
    }

    public static string Serialize(IEnumerable<PaymentRecordLink> links)
    {
        return JsonSerializer.Serialize(links, SerializerOptions);
    }
}
