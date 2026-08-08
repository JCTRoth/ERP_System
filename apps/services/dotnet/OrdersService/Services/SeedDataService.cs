using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrdersService.Data;
using OrdersService.Models;

namespace OrdersService.Services;

public interface ISeedDataService
{
    Task SeedAsync();
}

/// <summary>
/// Seeds demo orders for local development (idempotent — checks by order number).
/// Referenced customer IDs match the fixed customer IDs seeded by ShopService,
/// so order data stays coherent across services.
/// </summary>
public class SeedDataService : ISeedDataService
{
    private readonly OrdersDbContext _context;
    private readonly ILogger<SeedDataService> _logger;

    // Fixed customer IDs seeded by ShopService.SeedDataService (accounting integration)
    private static readonly Guid CustomerJonasR = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f");
    private static readonly Guid CustomerLisaBauer = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48e");
    private static readonly Guid CustomerThomasKeller = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48d");

    // Demo product IDs (stand-in references for the seeded MediVita product range;
    // the orders DB has no foreign key to the shop service)
    private static readonly Guid ProductCardioPro = Guid.Parse("10000000-0000-0000-0000-000000000001");
    private static readonly Guid ProductVitaminD3 = Guid.Parse("10000000-0000-0000-0000-000000000002");
    private static readonly Guid ProductElderberry = Guid.Parse("10000000-0000-0000-0000-000000000003");
    private static readonly Guid ProductOmega3 = Guid.Parse("10000000-0000-0000-0000-000000000004");
    private static readonly Guid ProductPainRelief = Guid.Parse("10000000-0000-0000-0000-000000000005");

    public SeedDataService(OrdersDbContext context, ILogger<SeedDataService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting OrdersService database seeding...");

            var seeded = await SeedDemoOrders();

            _logger.LogInformation("OrdersService database seeding completed ({Seeded} new order(s))", seeded);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during OrdersService database seeding");
            throw;
        }
    }

    private async Task<int> SeedDemoOrders()
    {
        var orders = BuildDemoOrders();

        var existingNumbers = await _context.Orders
            .Where(o => orders.Select(x => x.OrderNumber).Contains(o.OrderNumber))
            .Select(o => o.OrderNumber)
            .ToListAsync();

        var newOrders = orders.Where(o => !existingNumbers.Contains(o.OrderNumber, StringComparer.OrdinalIgnoreCase)).ToList();
        if (newOrders.Count == 0)
        {
            _logger.LogInformation("All demo orders already present, nothing to seed.");
            return 0;
        }

        await _context.Orders.AddRangeAsync(newOrders);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} demo order(s)", newOrders.Count);
        return newOrders.Count;
    }

    private static List<Order> BuildDemoOrders()
    {
        var now = DateTime.UtcNow;
        return new List<Order>
        {
            // Delivered order — Jonas R
            new()
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
                OrderNumber = "ORD-2026-0001",
                CustomerId = CustomerJonasR,
                CompanyId = OrdersDbContext.DemoCompanyId,
                Status = OrderStatus.Delivered,
                OrderDate = now.AddDays(-45),
                DueDate = now.AddDays(-15),
                TotalAmount = 79.97m,
                CreatedAt = now.AddDays(-45),
                UpdatedAt = now.AddDays(-15),
                Items = new List<OrderItem>
                {
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000101"),
                        ProductId = ProductCardioPro,
                        Quantity = 2,
                        UnitPrice = 29.99m,
                        LineTotal = 59.98m
                    },
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000102"),
                        ProductId = ProductVitaminD3,
                        Quantity = 1,
                        UnitPrice = 19.99m,
                        LineTotal = 19.99m
                    }
                }
            },
            // Shipped order — Lisa Bauer
            new()
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000002"),
                OrderNumber = "ORD-2026-0002",
                CustomerId = CustomerLisaBauer,
                CompanyId = OrdersDbContext.DemoCompanyId,
                Status = OrderStatus.Shipped,
                OrderDate = now.AddDays(-20),
                DueDate = now.AddDays(10),
                TotalAmount = 79.97m,
                CreatedAt = now.AddDays(-20),
                UpdatedAt = now.AddDays(-5),
                Items = new List<OrderItem>
                {
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000201"),
                        ProductId = ProductElderberry,
                        Quantity = 1,
                        UnitPrice = 24.99m,
                        LineTotal = 24.99m
                    },
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000202"),
                        ProductId = ProductOmega3,
                        Quantity = 1,
                        UnitPrice = 34.99m,
                        LineTotal = 34.99m
                    },
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000203"),
                        ProductId = ProductVitaminD3,
                        Quantity = 1,
                        UnitPrice = 19.99m,
                        LineTotal = 19.99m
                    }
                }
            },
            // Confirmed order — Thomas Keller
            new()
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000003"),
                OrderNumber = "ORD-2026-0003",
                CustomerId = CustomerThomasKeller,
                CompanyId = OrdersDbContext.DemoCompanyId,
                Status = OrderStatus.Confirmed,
                OrderDate = now.AddDays(-3),
                DueDate = now.AddDays(27),
                TotalAmount = 68.96m,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-3),
                Items = new List<OrderItem>
                {
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000301"),
                        ProductId = ProductPainRelief,
                        Quantity = 3,
                        UnitPrice = 12.99m,
                        LineTotal = 38.97m
                    },
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000302"),
                        ProductId = ProductCardioPro,
                        Quantity = 1,
                        UnitPrice = 29.99m,
                        LineTotal = 29.99m
                    }
                }
            },
            // Pending order — Jonas R (open follow-up)
            new()
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000004"),
                OrderNumber = "ORD-2026-0004",
                CustomerId = CustomerJonasR,
                CompanyId = OrdersDbContext.DemoCompanyId,
                Status = OrderStatus.Pending,
                OrderDate = now.AddDays(-1),
                DueDate = now.AddDays(29),
                TotalAmount = 54.98m,
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1),
                Items = new List<OrderItem>
                {
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000401"),
                        ProductId = ProductCardioPro,
                        Quantity = 1,
                        UnitPrice = 29.99m,
                        LineTotal = 29.99m
                    },
                    new()
                    {
                        Id = Guid.Parse("20000000-0000-0000-0000-000000000402"),
                        ProductId = ProductElderberry,
                        Quantity = 1,
                        UnitPrice = 24.99m,
                        LineTotal = 24.99m
                    }
                }
            }
        };
    }
}
