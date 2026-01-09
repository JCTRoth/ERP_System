using Microsoft.EntityFrameworkCore;
using OrdersService.Data;
using OrdersService.DTOs;
using OrdersService.Models;

namespace OrdersService.Services;

public class OrderService : IOrderService
{
    private readonly OrdersDbContext _context;
    private readonly ILogger<OrderService> _logger;

    public OrderService(OrdersDbContext context, ILogger<OrderService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Order?> GetByIdAsync(Guid id)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<Order?> GetByOrderNumberAsync(string orderNumber)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
    }

    public async Task<IEnumerable<Order>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .OrderByDescending(o => o.OrderDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetByStatusAsync(OrderStatus status, int skip = 0, int take = 50)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.Status == status)
            .OrderByDescending(o => o.OrderDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId, int skip = 0, int take = 50)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.OrderDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<Order> CreateAsync(CreateOrderInput input)
    {
        try
        {
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = input.OrderNumber,
                CustomerId = input.CustomerId,
                CompanyId = input.CompanyId,
                DueDate = input.DueDate,
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            foreach (var itemInput in input.Items)
            {
                var item = new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order.Id,
                    ProductId = itemInput.ProductId,
                    Quantity = itemInput.Quantity,
                    UnitPrice = itemInput.UnitPrice,
                    LineTotal = itemInput.Quantity * itemInput.UnitPrice
                };
                order.Items.Add(item);
            }

            order.TotalAmount = order.Items.Sum(i => i.LineTotal);

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order {order.OrderNumber} created with ID {order.Id}");
            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            throw;
        }
    }

    public async Task<Order?> UpdateStatusAsync(Guid id, UpdateOrderStatusInput input)
    {
        try
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return null;
            }

            order.Status = input.Status;
            order.UpdatedAt = DateTime.UtcNow;

            _context.Orders.Update(order);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order {order.OrderNumber} status updated to {input.Status}");
            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error updating order {id}");
            throw;
        }
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        try
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return false;
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order {order.OrderNumber} deleted");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error deleting order {id}");
            throw;
        }
    }
}
