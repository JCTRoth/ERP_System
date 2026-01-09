using OrdersService.DTOs;
using OrdersService.Models;

namespace OrdersService.Services;

public interface IOrderItemService
{
    Task<OrderItem?> GetByIdAsync(Guid id);
    Task<IEnumerable<OrderItem>> GetByOrderAsync(Guid orderId);
    Task<OrderItem> AddItemAsync(Guid orderId, CreateOrderItemInput input);
    Task<bool> RemoveItemAsync(Guid id);
}
