using HotChocolate.Types;
using HotChocolate.ApolloFederation;
using HotChocolate.ApolloFederation.Types;
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
        // Parent projection may not include scalar foreign keys (CategoryId) when Hot Chocolate
        // projects a subset of fields. If CategoryId is missing or empty, try to load it
        // from the database using the product Id.
        Guid? categoryId = product.CategoryId;
        if (categoryId == null || categoryId == Guid.Empty)
        {
            categoryId = await context.Products
                .AsNoTracking()
                .Where(p => p.Id == product.Id)
                .Select(p => p.CategoryId)
                .FirstOrDefaultAsync();
        }

        if (categoryId == null || categoryId == Guid.Empty)
            return null;

        return await context.Categories.FindAsync(categoryId.Value);
    }

    public async Task<Brand?> GetBrand([Parent] Product product, [Service] ShopDbContext context)
    {
        // Same approach as GetCategory: ensure BrandId is available even when parent
        // projection omitted scalar fields.
        Guid? brandId = product.BrandId;
        if (brandId == null || brandId == Guid.Empty)
        {
            brandId = await context.Products
                .AsNoTracking()
                .Where(p => p.Id == product.Id)
                .Select(p => p.BrandId)
                .FirstOrDefaultAsync();
        }

        if (brandId == null || brandId == Guid.Empty)
            return null;

        return await context.Brands.FindAsync(brandId.Value);
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
        // Rename to ShopAddress to avoid collision with MasterdataService Address type
        descriptor.Name("ShopAddress");
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
        // Mark as shareable with key for Apollo Federation entity resolution
        descriptor.Shareable();
        descriptor.Key("id");
        
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
        // Mark as shareable and define key for Apollo Federation entity resolution
        descriptor.Shareable();
        descriptor.Key("id");
        
        descriptor.Field(i => i.Id).Type<NonNullType<IdType>>();
        descriptor.Field(i => i.OrderId).Type<NonNullType<IdType>>();  // Explicitly define as ID to match orders-service
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
        
        // Ignore navigation properties 
        descriptor.Field(i => i.Order).Ignore();
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
        // Mark as shareable with key for Apollo Federation entity resolution
        descriptor.Shareable();
        descriptor.Key("id");
        
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>();
        descriptor.Field(o => o.CustomerId).Type<IdType>();
        descriptor.Field(o => o.Status).Type<NonNullType<EnumType<OrderStatus>>>().Shareable();
        descriptor.Field(o => o.PaymentStatus).Type<NonNullType<EnumType<PaymentStatus>>>();
        
        descriptor.Field(o => o.Subtotal).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.TaxAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.ShippingAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.DiscountAmount).Type<NonNullType<DecimalType>>();
        descriptor.Field(o => o.Total).Type<NonNullType<DecimalType>>();
        
        descriptor.Field("itemCount")
            .Type<NonNullType<IntType>>()
            .ResolveWith<OrderResolvers>(r => r.GetItemCountAsync(default!, default!));
        
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
        
        descriptor.Field(o => o.Documents)
            .Type<NonNullType<ListType<NonNullType<OrderDocumentType>>>>()
            .ResolveWith<OrderResolvers>(r => r.GetDocuments(default!, default!));
    }
}

public class OrderResolvers
{
    public IQueryable<OrderItem> GetItems([Parent] Order order, [Service] ShopDbContext context)
    {
        return context.OrderItems.Where(i => i.OrderId == order.Id);
    }

    public async Task<int> GetItemCountAsync([Parent] Order order, [Service] ShopDbContext context)
    {
        var orderId = order.Id;

        if (orderId == Guid.Empty && !string.IsNullOrEmpty(order.OrderNumber))
        {
            orderId = await context.Orders
                .AsNoTracking()
                .Where(o => o.OrderNumber == order.OrderNumber)
                .Select(o => o.Id)
                .FirstOrDefaultAsync();
        }

        if (orderId == Guid.Empty)
        {
            return 0;
        }

        return await context.OrderItems.CountAsync(i => i.OrderId == orderId);
    }

    public IQueryable<Payment> GetPayments([Parent] Order order, [Service] ShopDbContext context)
    {
        return context.Payments.Where(p => p.OrderId == order.Id);
    }
    
    // Customer resolver - fetches real customer data from ShopService database
    // The ShopService Customer table is synchronized with MasterdataService for consistency
    // Customer resolver - fetches real customer data from ShopService database
    // The ShopService Customer table is synchronized with MasterdataService for consistency
    public User? GetCustomer([Parent] Order order, [Service] ShopDbContext context)
    {
        try
        {
            // Get the CustomerId from the parent Order
            var customerId = order.CustomerId;
            if (customerId == Guid.Empty)
            {
                // If CustomerId is empty on the parent, try loading from DB
                var dbOrder = context.Orders.AsNoTracking().Where(o => o.Id == order.Id).Select(o => o.CustomerId).FirstOrDefault();
                customerId = dbOrder;
            }

            if (customerId == Guid.Empty)
            {
                return null;
            }

            // Fetch the customer data from the Customers table (synced with MasterdataService)
            var customer = context.Customers.AsNoTracking().FirstOrDefault(c => c.Id == customerId);
            
            if (customer == null)
            {
                // Customer not found in local table, return null (avoid crashes)
                return null;
            }

            // Return User object populated with customer data
            // This data is kept in sync with MasterdataService
            return new User
            {
                Id = customer.Id,
                FirstName = customer.FirstName ?? string.Empty,
                LastName = customer.LastName ?? string.Empty,
                Email = customer.Email,
                Phone = customer.Phone
            };
        }
        catch (Exception ex)
        {
            // Log the error and return null to prevent the entire query from failing
            Console.WriteLine($"Error in GetCustomer resolver: {ex.Message}");
            return null;
        }
    }    public IQueryable<OrderDocument> GetDocuments([Parent] Order order, [Service] ShopDbContext context)
    {
        return context.OrderDocuments.Where(d => d.OrderId == order.Id).OrderByDescending(d => d.GeneratedAt);
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

public class OrderDocumentType : ObjectType<OrderDocument>
{
    protected override void Configure(IObjectTypeDescriptor<OrderDocument> descriptor)
    {
        descriptor.Field(d => d.Id).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.DocumentType).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.State).Type<StringType>();
        descriptor.Field(d => d.PdfUrl).Type<StringType>();
        descriptor.Field(d => d.GeneratedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(d => d.TemplateKey).Type<StringType>();
    }
}

public class SupplierType : ObjectType<Supplier>
{
    protected override void Configure(IObjectTypeDescriptor<Supplier> descriptor)
    {
        // Rename to ShopSupplier to avoid collision with MasterdataService Supplier type
        descriptor.Name("ShopSupplier");
        
        descriptor.Field(s => s.Id).Type<NonNullType<IdType>>();
        descriptor.Field(s => s.Name).Type<NonNullType<StringType>>();
        descriptor.Field(s => s.Code).Type<StringType>();
        descriptor.Field(s => s.ContactPerson).Type<StringType>();
        descriptor.Field(s => s.Email).Type<StringType>();
        descriptor.Field(s => s.Phone).Type<StringType>();
        descriptor.Field(s => s.Address).Type<StringType>();
        descriptor.Field(s => s.City).Type<StringType>();
        descriptor.Field(s => s.PostalCode).Type<StringType>();
        descriptor.Field(s => s.Country).Type<StringType>();
        descriptor.Field(s => s.VatNumber).Type<StringType>();
        descriptor.Field(s => s.LeadTimeDays).Type<NonNullType<IntType>>();
        descriptor.Field(s => s.Currency).Type<NonNullType<StringType>>();
        descriptor.Field(s => s.IsActive).Type<NonNullType<BooleanType>>();
        descriptor.Field(s => s.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(s => s.UpdatedAt).Type<DateTimeType>();
    }
}
