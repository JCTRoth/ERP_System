using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ShopService.Data;
using ShopService.Models;
using ShopService.Services;
using Xunit;

namespace ShopService.Tests.Services;

public class PaymentServiceTests
{
    [Fact]
    public async Task ProcessAsync_CompletedPartialPayment_SyncsAccountingModule()
    {
        using var context = CreateContext();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "ORD-1000",
            CustomerId = Guid.NewGuid(),
            Total = 200m,
            Subtotal = 200m,
            Currency = "EUR",
            CreatedAt = DateTime.UtcNow
        };
        context.Orders.Add(order);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Amount = 50m,
            Currency = "EUR",
            Method = PaymentMethod.CreditCard,
            Status = PaymentTransactionStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var jobProcessor = new TestOrderJobProcessor();
        var service = new PaymentService(context, NullLogger<PaymentService>.Instance, jobProcessor);

        await service.ProcessAsync(payment.Id);

        jobProcessor.SyncedOrderIds.Should().ContainSingle(id => id == order.Id);
        order.PaymentStatus.Should().Be(PaymentStatus.PartiallyPaid);
    }

    [Fact]
    public async Task RefundAsync_TriggersAccountingSync()
    {
        using var context = CreateContext();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "ORD-2000",
            CustomerId = Guid.NewGuid(),
            Total = 200m,
            Subtotal = 200m,
            Currency = "EUR",
            PaymentStatus = PaymentStatus.Paid,
            CreatedAt = DateTime.UtcNow
        };
        context.Orders.Add(order);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Amount = 200m,
            Currency = "EUR",
            Method = PaymentMethod.CreditCard,
            Status = PaymentTransactionStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            ProcessedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        var jobProcessor = new TestOrderJobProcessor();
        var service = new PaymentService(context, NullLogger<PaymentService>.Instance, jobProcessor);

        await service.RefundAsync(payment.Id, 50m, "Partial refund");

        jobProcessor.SyncedOrderIds.Should().Contain(order.Id);
    }

    private static ShopDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ShopDbContext(options);
    }

    private sealed class TestOrderJobProcessor : IOrderJobProcessor
    {
        public List<Guid> SyncedOrderIds { get; } = new();
        public List<(Guid OrderId, string State)> GeneratedDocuments { get; } = new();

        public Task EnqueueDocumentGenerationAsync(Guid orderId, string state) => Task.CompletedTask;
        public Task EnqueueInvoiceCreationAsync(Guid orderId) => Task.CompletedTask;
        public Task ProcessPendingJobsAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task GenerateDocumentsForOrderAsync(Guid orderId, string state)
        {
            GeneratedDocuments.Add((orderId, state));
            return Task.CompletedTask;
        }

        public Task CreateInvoiceAndSyncPaymentsForOrderAsync(Guid orderId)
        {
            SyncedOrderIds.Add(orderId);
            return Task.CompletedTask;
        }
    }
}
