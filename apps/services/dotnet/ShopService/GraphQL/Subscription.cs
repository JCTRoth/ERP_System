using HotChocolate;
using ShopService.Models;

namespace ShopService.GraphQL;

public class Subscription
{
    [Subscribe]
    [Topic]
    public Order OnOrderCreated([EventMessage] Order order) => order;

    [Subscribe]
    [Topic]
    public Order OnOrderStatusChanged([EventMessage] Order order) => order;

    [Subscribe]
    [Topic]
    public Product OnLowStock([EventMessage] Product product) => product;

    [Subscribe]
    [Topic]
    public Payment OnPaymentProcessed([EventMessage] Payment payment) => payment;
}
