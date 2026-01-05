using HotChocolate.Types;
using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.Models;

namespace ShopService.GraphQL;

public class ProductType : ObjectType<Product>
{
    protected override void Configure(IObjectTypeDescriptor<Product> descriptor)
    {
        
        descriptor.Field(p => p.Id).Type<NonNullType<IdType>>();
        descriptor.Field(p => p.Name).Type<NonNullType<StringType>>();
        descriptor.Field(p => p.Status).Type<NonNullType<EnumType<ProductStatus>>>();
        
        descriptor.Field(p => p.Category)
            .ResolveWith<ProductResolvers>(r => r.GetCategory(default!, default!));
        
        descriptor.Field(p => p.Brand)
            .ResolveWith<ProductResolvers>(r => r.GetBrand(default!, default!));

        descriptor.Field(p => p.Images)
            .ResolveWith<ProductResolvers>(r => r.GetImages(default!, default!));

        descriptor.Field(p => p.Variants)
            .ResolveWith<ProductResolvers>(r => r.GetVariants(default!, default!));

        descriptor.Field("primaryImage")
            .Type<ProductImageType>()
            .ResolveWith<ProductResolvers>(r => r.GetPrimaryImage(default!, default!));
    }
}

public class ProductResolvers
{
    public async Task<Category?> GetCategory([Parent] Product product, [Service] ShopDbContext context)
    {
        if (product.CategoryId == null) return null;
        return await context.Categories.FindAsync(product.CategoryId);
    }

    public async Task<Brand?> GetBrand([Parent] Product product, [Service] ShopDbContext context)
    {
        if (product.BrandId == null) return null;
        return await context.Brands.FindAsync(product.BrandId);
    }

    public IQueryable<ProductImage> GetImages([Parent] Product product, [Service] ShopDbContext context)
    {
        return context.ProductImages
            .Where(i => i.ProductId == product.Id)
            .OrderBy(i => i.SortOrder);
    }

    public IQueryable<ProductVariant> GetVariants([Parent] Product product, [Service] ShopDbContext context)
    {
        return context.ProductVariants
            .Where(v => v.ProductId == product.Id);
    }

    public async Task<ProductImage?> GetPrimaryImage([Parent] Product product, [Service] ShopDbContext context)
    {
        return await context.ProductImages
            .Where(i => i.ProductId == product.Id && i.IsPrimary)
            .FirstOrDefaultAsync() ?? 
            await context.ProductImages
            .Where(i => i.ProductId == product.Id)
            .OrderBy(i => i.SortOrder)
            .FirstOrDefaultAsync();
    }
}

public class ProductImageType : ObjectType<ProductImage>
{
    protected override void Configure(IObjectTypeDescriptor<ProductImage> descriptor)
    {
        descriptor.Field(i => i.Id).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.Url).Type<NonNullType<StringType>>();
    }
}

public class AddressType : ObjectType<Address>
{
    protected override void Configure(IObjectTypeDescriptor<Address> descriptor)
    {
        descriptor.Field(a => a.Name).Type<StringType>();
        descriptor.Field(a => a.Street).Type<StringType>();
        descriptor.Field(a => a.City).Type<StringType>();
        descriptor.Field(a => a.PostalCode).Type<StringType>();
        descriptor.Field(a => a.Country).Type<StringType>();
        descriptor.Field(a => a.Phone).Type<StringType>();
    }
}

public class Address
{
    public string? Name { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
}

public class UserType : ObjectType<User>
{
    protected override void Configure(IObjectTypeDescriptor<User> descriptor)
    {
        descriptor.Field(u => u.Id).Type<NonNullType<IdType>>();
        descriptor.Field(u => u.FirstName).Type<StringType>();
        descriptor.Field(u => u.LastName).Type<StringType>();
        descriptor.Field(u => u.Email).Type<NonNullType<StringType>>();
        descriptor.Field(u => u.Phone).Type<StringType>();
    }
}

public class User
{
    public Guid Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class OrderItemType : ObjectType<OrderItem>
{
    protected override void Configure(IObjectTypeDescriptor<OrderItem> descriptor)
    {
        descriptor.Field(i => i.Id).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.ProductId).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.ProductName).Type<NonNullType<StringType>>();
        descriptor.Field("productSku").Type<NonNullType<StringType>>()
            .Resolve(context => context.Parent<OrderItem>().Sku);
        descriptor.Field(i => i.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(i => i.UnitPrice).Type<NonNullType<DecimalType>>();
        descriptor.Field("discount").Type<NonNullType<DecimalType>>()
            .Resolve(context => context.Parent<OrderItem>().DiscountAmount);
        descriptor.Field(i => i.TaxAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(i => i.Total).Type<NonNullType<DecimalType>>();
        descriptor.Field(i => i.Notes).Type<StringType>();
        descriptor.Field(i => i.CreatedAt).Type<NonNullType<DateTimeType>>();
        
        descriptor.Field("product")
            .Type<NonNullType<ProductType>>()
            .ResolveWith<OrderItemResolvers>(r => r.GetProduct(default!, default!));
    }
}

public class OrderItemResolvers
{
    public async Task<Product?> GetProduct([Parent] OrderItem item, [Service] ShopDbContext context)
    {
        return await context.Products.FindAsync(item.ProductId);
    }
}

public class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>();
        descriptor.Field(o => o.CustomerId).Type<IdType>();
        descriptor.Field(o => o.Status).Type<NonNullType<EnumType<OrderStatus>>>();
        descriptor.Field(o => o.PaymentStatus).Type<NonNullType<EnumType<PaymentStatus>>>();
        
        descriptor.Field(o => o.Subtotal).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.TaxAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.ShippingAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.DiscountAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.Total).Type<NonNullType<DecimalType>>();
        
        descriptor.Field("itemCount")
            .Type<NonNullType<IntType>>()
            .Resolve(context => context.Parent<Order>().Items.Count);
        
        descriptor.Field(o => o.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(o => o.UpdatedAt).Type<DateTimeType>();
        descriptor.Field(o => o.Notes).Type<StringType>();
        
        // Address objects
        descriptor.Field("shippingAddress")
            .Type<AddressType>()
            .Resolve(context => {
                var order = context.Parent<Order>();
                return new Address {
                    Name = order.ShippingName,
                    Street = order.ShippingAddress,
                    City = order.ShippingCity,
                    PostalCode = order.ShippingPostalCode,
                    Country = order.ShippingCountry,
                    Phone = order.ShippingPhone
                };
            });
        
        descriptor.Field("billingAddress")
            .Type<AddressType>()
            .Resolve(context => {
                var order = context.Parent<Order>();
                return new Address {
                    Name = order.BillingName,
                    Street = order.BillingAddress,
                    City = order.BillingCity,
                    PostalCode = order.BillingPostalCode,
                    Country = order.BillingCountry
                };
            });
        
        descriptor.Field(o => o.Items)
            .Type<NonNullType<ListType<NonNullType<OrderItemType>>>>()
            .ResolveWith<OrderResolvers>(r => r.GetItems(default!, default!));

        descriptor.Field(o => o.Payments)
            .ResolveWith<OrderResolvers>(r => r.GetPayments(default!, default!));
        
        descriptor.Field("customer")
            .Type<UserType>()
            .ResolveWith<OrderResolvers>(r => r.GetCustomer(default!, default!));
    }
}

public class OrderResolvers
{
    public IQueryable<OrderItem> GetItems([Parent] Order order, [Service] ShopDbContext context)
    {
        return context.OrderItems.Where(i => i.OrderId == order.Id);
    }

    public IQueryable<Payment> GetPayments([Parent] Order order, [Service] ShopDbContext context)
    {
        return context.Payments.Where(p => p.OrderId == order.Id);
    }
    
    // Customer resolver - fetches from ShopService database
    public User? GetCustomer([Parent] Order order, [Service] ShopDbContext context)
    {
        if (order.CustomerId == Guid.Empty)
            return null;
            
        // For now, return customer data based on CustomerId
        // In a production system, this would query the customer database
        return new User
        {
            Id = order.CustomerId,
            FirstName = "Customer", // Could be enhanced to look up actual names
            LastName = "",
            Email = "customer@example.com",
            Phone = null
        };
    }
}

public class PaymentType : ObjectType<Payment>
{
    protected override void Configure(IObjectTypeDescriptor<Payment> descriptor)
    {
        descriptor.Field(p => p.Id).Type<NonNullType<IdType>>();
        descriptor.Field(p => p.OrderId).Type<NonNullType<IdType>>();
        descriptor.Field(p => p.Amount).Type<NonNullType<DecimalType>>();
        descriptor.Field(p => p.Currency).Type<NonNullType<StringType>>();
        descriptor.Field(p => p.Status).Type<NonNullType<EnumType<PaymentTransactionStatus>>>();
        descriptor.Field(p => p.TransactionId).Type<StringType>();
        descriptor.Field(p => p.GatewayReference).Type<StringType>();
        
        // Expose Method as string instead of enum to avoid schema conflicts
        descriptor.Field("method")
            .Type<NonNullType<StringType>>()
            .Resolve(context => context.Parent<Payment>().Method.ToString());
    }
}

public class CartType : ObjectType<Cart>
{
    protected override void Configure(IObjectTypeDescriptor<Cart> descriptor)
    {
        
        descriptor.Field(c => c.Id).Type<NonNullType<IdType>>();
        
        descriptor.Field(c => c.Items)
            .ResolveWith<CartResolvers>(r => r.GetItems(default!, default!));
    }
}

public class CartResolvers
{
    public IQueryable<CartItem> GetItems([Parent] Cart cart, [Service] ShopDbContext context)
    {
        return context.CartItems.Where(i => i.CartId == cart.Id);
    }
}
