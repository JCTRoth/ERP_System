using OrdersService.Models;
using OrdersService.Services;
using HotChocolate;

namespace OrdersService.GraphQL;

public class Query
{
    [GraphQLDescription("Get an order by ID")]
    public async Task<Order?> GetOrder(
        string id,
        [Service] IOrderService orderService)
    {
        if (Guid.TryParse(id, out var guid))
        {
            return await orderService.GetByIdAsync(guid);
        }
        return null;
    }

    [GraphQLDescription("Get an order by order number")]
    public async Task<Order?> GetOrderByNumber(
        string orderNumber,
        [Service] IOrderService orderService)
    {
        return await orderService.GetByOrderNumberAsync(orderNumber);
    }

    [GraphQLDescription("Get all orders with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Order>> GetOrders(
        [Service] IOrderService orderService)
    {
        return await orderService.GetAllAsync();
    }

    [GraphQLDescription("Get orders by status")]
    [UsePaging(IncludeTotalCount = true)]
    [UseSorting]
    public async Task<IEnumerable<Order>> GetOrdersByStatus(
        OrderStatus status,
        [Service] IOrderService orderService)
    {
        return await orderService.GetByStatusAsync(status);
    }

    [GraphQLDescription("Get orders by customer")]
    [UsePaging(IncludeTotalCount = true)]
    [UseSorting]
    public async Task<IEnumerable<Order>> GetOrdersByCustomer(
        string customerId,
        [Service] IOrderService orderService)
    {
        if (Guid.TryParse(customerId, out var guid))
        {
            return await orderService.GetByCustomerAsync(guid);
        }
        return Enumerable.Empty<Order>();
    }
}
