using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IPaymentService
{
    Task<Payment?> GetByIdAsync(Guid id);
    Task<IEnumerable<Payment>> GetByOrderIdAsync(Guid orderId);
    Task<Payment> CreateAsync(CreatePaymentInput input);
    Task<Payment?> ProcessAsync(Guid paymentId);
    Task<Payment?> RefundAsync(Guid paymentId, decimal? amount, string? reason);
    Task<bool> VoidAsync(Guid paymentId, string? reason);
}

public class PaymentService : IPaymentService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<PaymentService> _logger;
    private readonly IOrderJobProcessor _orderJobProcessor;

    public PaymentService(
        ShopDbContext context,
        ILogger<PaymentService> logger,
        IOrderJobProcessor orderJobProcessor)
    {
        _context = context;
        _logger = logger;
        _orderJobProcessor = orderJobProcessor;
    }

    public async Task<Payment?> GetByIdAsync(Guid id)
    {
        return await _context.Payments
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Payment>> GetByOrderIdAsync(Guid orderId)
    {
        return await _context.Payments
            .Where(p => p.OrderId == orderId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<Payment> CreateAsync(CreatePaymentInput input)
    {
        var order = await _context.Orders.FindAsync(input.OrderId);
        if (order == null)
            throw new InvalidOperationException($"Order {input.OrderId} not found");

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = input.OrderId,
            Amount = input.Amount,
            Currency = input.Currency,
            Method = Enum.Parse<PaymentMethod>(input.Method),
            Status = PaymentTransactionStatus.Pending,
            TransactionId = input.TransactionId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment created: {PaymentId} for Order {OrderId}", payment.Id, input.OrderId);

        return payment;
    }

    public async Task<Payment?> ProcessAsync(Guid paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null) return null;

        // Simulate payment processing
        // In production, this would integrate with a payment gateway
        try
        {
            // Simulate gateway call
            await Task.Delay(100);

            payment.Status = PaymentTransactionStatus.Completed;
            payment.ProcessedAt = DateTime.UtcNow;
            payment.GatewayReference = $"SIM-{Guid.NewGuid():N}".Substring(0, 20);

            // Update order payment status
            var order = payment.Order;
            var previousPaymentStatus = order.PaymentStatus;
            var totalPaid = await _context.Payments
                .Where(p => p.OrderId == order.Id && p.Status == PaymentTransactionStatus.Completed)
                .SumAsync(p => p.Amount) + payment.Amount;

            if (totalPaid >= order.Total)
            {
                order.PaymentStatus = Models.PaymentStatus.Paid;
                order.Status = OrderStatus.Confirmed;
            }
            else
            {
                order.PaymentStatus = Models.PaymentStatus.PartiallyPaid;
            }

            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Payment processed: {PaymentId}, Status: {Status}",
                paymentId, payment.Status);

            // When the order transitions to fully paid, trigger invoice creation,
            // accounting payment record sync, and customer-facing invoice documents
            if (previousPaymentStatus != Models.PaymentStatus.Paid &&
                order.PaymentStatus == Models.PaymentStatus.Paid)
            {
                try
                {
                    await _orderJobProcessor.CreateInvoiceAndSyncPaymentsForOrderAsync(order.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error creating invoice and syncing payments for fully paid order {OrderId}",
                        order.Id);
                }

                try
                {
                    // Use the confirmed state so the invoice template is applied
                    await _orderJobProcessor.GenerateDocumentsForOrderAsync(order.Id, "confirmed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error generating documents for fully paid order {OrderId}", order.Id);
                }
            }
        }
        catch (Exception ex)
        {
            payment.Status = PaymentTransactionStatus.Failed;
            payment.ErrorMessage = ex.Message;
            await _context.SaveChangesAsync();

            _logger.LogError(ex, "Payment processing failed: {PaymentId}", paymentId);
        }

        return payment;
    }

    public async Task<Payment?> RefundAsync(Guid paymentId, decimal? amount, string? reason)
    {
        var payment = await _context.Payments
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null) return null;

        if (payment.Status != PaymentTransactionStatus.Completed)
        {
            _logger.LogWarning("Cannot refund payment {PaymentId} - not completed", paymentId);
            return null;
        }

        var refundAmount = amount ?? payment.Amount;

        // Create refund payment
        var refund = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = payment.OrderId,
            Amount = -refundAmount,
            Currency = payment.Currency,
            Method = payment.Method,
            Status = PaymentTransactionStatus.Completed,
            TransactionId = $"REF-{payment.TransactionId}",
            GatewayReference = $"REF-{payment.GatewayReference}",
            CreatedAt = DateTime.UtcNow,
            ProcessedAt = DateTime.UtcNow
        };

        _context.Payments.Add(refund);

        // Update order payment status
        var order = payment.Order;
        var totalPaid = await _context.Payments
            .Where(p => p.OrderId == order.Id && p.Status == PaymentTransactionStatus.Completed)
            .SumAsync(p => p.Amount);

        totalPaid -= refundAmount;

        if (totalPaid <= 0)
        {
            order.PaymentStatus = Models.PaymentStatus.Refunded;
        }
        else
        {
            order.PaymentStatus = Models.PaymentStatus.PartiallyRefunded;
        }

        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment refunded: {PaymentId}, Amount: {Amount}, Reason: {Reason}",
            paymentId, refundAmount, reason);

        return refund;
    }

    public async Task<bool> VoidAsync(Guid paymentId, string? reason)
    {
        var payment = await _context.Payments.FindAsync(paymentId);
        if (payment == null) return false;

        if (payment.Status != PaymentTransactionStatus.Pending &&
            payment.Status != PaymentTransactionStatus.Processing)
        {
            _logger.LogWarning("Cannot void payment {PaymentId} - invalid status", paymentId);
            return false;
        }

        payment.Status = PaymentTransactionStatus.Cancelled;
        payment.ErrorMessage = reason;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment voided: {PaymentId}, Reason: {Reason}", paymentId, reason);

        return true;
    }
}
