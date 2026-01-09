using Microsoft.EntityFrameworkCore;
using OrdersService.Data;
using OrdersService.DTOs;
using OrdersService.Models;

namespace OrdersService.Services;

public class OrderItemService : IOrderItemService
{
    private readonly OrdersDbContext _context;
    private readonly ILogger<OrderItemService> _logger;

    public OrderItemService(OrdersDbContext context, ILogger<OrderItemService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<OrderItem?> GetByIdAsync(Guid id)
    {
        return await _context.OrderItems
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<IEnumerable<OrderItem>> GetByOrderAsync(Guid orderId)
    {
        return await _context.OrderItems
            .Where(i => i.OrderId == orderId)
            .OrderBy(i => i.Id)
            .ToListAsync();
    }

    public async Task<OrderItem> AddItemAsync(Guid orderId, CreateOrderItemInput input)
    {
        try
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                throw new InvalidOperationException($"Order {orderId} not found");
            }

            var item = new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                ProductId = input.ProductId,
                Quantity = input.Quantity,
                UnitPrice = input.UnitPrice,
                LineTotal = input.Quantity * input.UnitPrice
            };

            _context.OrderItems.Add(item);

            // Update order total
            order.TotalAmount = await _context.OrderItems
                .Where(i => i.OrderId == orderId)
                .SumAsync(i => i.LineTotal) + item.LineTotal;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order item added to order {orderId}");
            return item;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error adding item to order {orderId}");
            throw;
        }
    }

    public async Task<bool> RemoveItemAsync(Guid id)
    {
        try
        {
            var item = await _context.OrderItems.FindAsync(id);
            if (item == null)
            {
                return false;
            }

            _context.OrderItems.Remove(item);

            // Update order total
            var order = await _context.Orders.FindAsync(item.OrderId);
            if (order != null)
            {
                order.TotalAmount = await _context.OrderItems
                    .Where(i => i.OrderId == item.OrderId)
                    .SumAsync(i => i.LineTotal);
                order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order item {id} removed");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error removing order item {id}");
            throw;
        }
    }
}
