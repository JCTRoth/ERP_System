using OrdersService.Models;
using HotChocolate.Subscriptions;

namespace OrdersService.GraphQL;

public class Subscription
{
    [GraphQLDescription("Subscribe to order creation events")]
    [Subscribe]
    public Order OnOrderCreated(
        [EventMessage] Order order)
    {
        return order;
    }

    [GraphQLDescription("Subscribe to order update events")]
    [Subscribe]
    public Order OnOrderUpdated(
        [EventMessage] Order order)
    {
        return order;
    }
}
