using OrdersService.Models;
using OrdersService.Services;
using OrdersService.DTOs;
using HotChocolate.Subscriptions;

namespace OrdersService.GraphQL;

public class Mutation
{
    [GraphQLDescription("Create a new order")]
    public async Task<Order> CreateOrder(
        CreateOrderInput input,
        [Service] IOrderService orderService,
        [Service] ITopicEventSender eventSender)
    {
        var order = await orderService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnOrderCreated), order);
        return order;
    }

    [GraphQLDescription("Update order status")]
    public async Task<Order?> UpdateOrderStatus(
        string orderId,
        UpdateOrderStatusInput input,
        [Service] IOrderService orderService,
        [Service] ITopicEventSender eventSender)
    {
        if (Guid.TryParse(orderId, out var guid))
        {
            var order = await orderService.UpdateStatusAsync(guid, input);
            if (order != null)
            {
                await eventSender.SendAsync(nameof(Subscription.OnOrderUpdated), order);
            }
            return order;
        }
        return null;
    }

    [GraphQLDescription("Add item to order")]
    public async Task<OrderItem> AddOrderItem(
        string orderId,
        CreateOrderItemInput input,
        [Service] IOrderItemService orderItemService)
    {
        if (Guid.TryParse(orderId, out var guid))
        {
            return await orderItemService.AddItemAsync(guid, input);
        }
        throw new ArgumentException("Invalid order ID");
    }

    [GraphQLDescription("Remove item from order")]
    public async Task<bool> RemoveOrderItem(
        string itemId,
        [Service] IOrderItemService orderItemService)
    {
        if (Guid.TryParse(itemId, out var guid))
        {
            return await orderItemService.RemoveItemAsync(guid);
        }
        return false;
    }

    [GraphQLDescription("Delete an order")]
    public async Task<bool> DeleteOrder(
        string orderId,
        [Service] IOrderService orderService)
    {
        if (Guid.TryParse(orderId, out var guid))
        {
            return await orderService.DeleteAsync(guid);
        }
        return false;
    }
}
