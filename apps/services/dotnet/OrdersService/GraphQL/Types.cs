using OrdersService.Models;
using OrdersService.Data;
using Microsoft.EntityFrameworkCore;

namespace OrdersService.GraphQL;

public class OrderObjectType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>();
        descriptor.Field(o => o.CustomerId).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.CompanyId).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.Status).Type<NonNullType<EnumType<OrderStatus>>>();
        descriptor.Field(o => o.OrderDate).Type<NonNullType<DateTimeType>>();
        descriptor.Field(o => o.DueDate).Type<NonNullType<DateTimeType>>();
        descriptor.Field(o => o.TotalAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(o => o.UpdatedAt).Type<NonNullType<DateTimeType>>();

        descriptor.Field(o => o.Items)
            .ResolveWith<OrderResolvers>(r => r.GetItems(default!, default!));
    }
}

public class OrderItemObjectType : ObjectType<OrderItem>
{
    protected override void Configure(IObjectTypeDescriptor<OrderItem> descriptor)
    {
        descriptor.Field(i => i.Id).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.OrderId).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.ProductId).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(i => i.UnitPrice).Type<NonNullType<DecimalType>>();
        descriptor.Field(i => i.LineTotal).Type<NonNullType<DecimalType>>();
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
