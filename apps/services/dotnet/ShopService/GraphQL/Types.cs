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

public class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>();
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
        
        descriptor.Field(o => o.Items)
            .ResolveWith<OrderResolvers>(r => r.GetItems(default!, default!));

        descriptor.Field(o => o.Payments)
            .ResolveWith<OrderResolvers>(r => r.GetPayments(default!, default!));
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
