using OrdersService.Models;
using OrdersService.Data;
using Microsoft.EntityFrameworkCore;
using HotChocolate.Types;
using HotChocolate.ApolloFederation.Types;

namespace OrdersService.GraphQL;

public class OrderObjectType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        // Mark as shareable with key for Apollo Federation entity resolution
        descriptor.Shareable();
        descriptor.Key("id");
        
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>().Shareable();
        descriptor.Field(o => o.CustomerId).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(o => o.CompanyId).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(o => o.Status).Type<NonNullType<EnumType<OrderStatus>>>().Shareable();
        descriptor.Field(o => o.OrderDate).Type<NonNullType<DateTimeType>>().Shareable();
        descriptor.Field(o => o.DueDate).Type<NonNullType<DateTimeType>>().Shareable();
        descriptor.Field(o => o.TotalAmount).Type<NonNullType<DecimalType>>().Shareable();
        descriptor.Field(o => o.CreatedAt).Type<NonNullType<DateTimeType>>().Shareable();
        descriptor.Field(o => o.UpdatedAt).Type<NonNullType<DateTimeType>>().Shareable();

        descriptor.Field(o => o.Items).Shareable()
            .ResolveWith<OrderResolvers>(r => r.GetItems(default!, default!));
    }
}

public class OrderItemObjectType : ObjectType<OrderItem>
{
    protected override void Configure(IObjectTypeDescriptor<OrderItem> descriptor)
    {
        // Mark as shareable and define key for Apollo Federation entity resolution
        descriptor.Shareable();
        descriptor.Key("id");
        
        descriptor.Field(i => i.Id).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(i => i.OrderId).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(i => i.ProductId).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(i => i.Quantity).Type<NonNullType<IntType>>().Shareable();
        descriptor.Field(i => i.UnitPrice).Type<NonNullType<DecimalType>>().Shareable();
        descriptor.Field(i => i.LineTotal).Type<NonNullType<DecimalType>>().Shareable();
    }
}

public class OrderResolvers
{
    [GraphQLDescription("Get order items")]
    public async Task<IEnumerable<OrderItem>> GetItems(
        [Parent] Order order,
        [Service] OrdersDbContext context)
    {
        return await context.OrderItems
            .Where(i => i.OrderId == order.Id)
            .ToListAsync();
    }
}
