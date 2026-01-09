using OrdersService.DTOs;
using OrdersService.Models;

namespace OrdersService.Services;

public interface IOrderService
{
    Task<Order?> GetByIdAsync(Guid id);
    Task<Order?> GetByOrderNumberAsync(string orderNumber);
    Task<IEnumerable<Order>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Order>> GetByStatusAsync(OrderStatus status, int skip = 0, int take = 50);
    Task<IEnumerable<Order>> GetByCustomerAsync(Guid customerId, int skip = 0, int take = 50);
    Task<Order> CreateAsync(CreateOrderInput input);
    Task<Order?> UpdateStatusAsync(Guid id, UpdateOrderStatusInput input);
    Task<bool> DeleteAsync(Guid id);
}
