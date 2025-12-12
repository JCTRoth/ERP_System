using Microsoft.EntityFrameworkCore;
using ShopService.Models;

namespace ShopService.Data;

public class ShopDbContext : DbContext
{
    public ShopDbContext(DbContextOptions<ShopDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductAttribute> ProductAttributes => Set<ProductAttribute>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ShippingMethod> ShippingMethods => Set<ShippingMethod>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasIndex(e => e.Sku).IsUnique();
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.Ean).HasColumnName("ean");
            entity.Property(e => e.Price).HasColumnName("price");
            entity.Property(e => e.CompareAtPrice).HasColumnName("compare_at_price");
            entity.Property(e => e.CostPrice).HasColumnName("cost_price");
            entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity");
            entity.Property(e => e.LowStockThreshold).HasColumnName("low_stock_threshold");
            entity.Property(e => e.TrackInventory).HasColumnName("track_inventory");
            entity.Property(e => e.AllowBackorder).HasColumnName("allow_backorder");
            entity.Property(e => e.Weight).HasColumnName("weight");
            entity.Property(e => e.WeightUnit).HasColumnName("weight_unit");
            entity.Property(e => e.Length).HasColumnName("length");
            entity.Property(e => e.Width).HasColumnName("width");
            entity.Property(e => e.Height).HasColumnName("height");
            entity.Property(e => e.DimensionUnit).HasColumnName("dimension_unit");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.BrandId).HasColumnName("brand_id");
            entity.Property(e => e.SupplierId).HasColumnName("supplier_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.IsFeatured).HasColumnName("is_featured");
            entity.Property(e => e.IsDigital).HasColumnName("is_digital");
            entity.Property(e => e.Slug).HasColumnName("slug");
            entity.Property(e => e.MetaTitle).HasColumnName("meta_title");
            entity.Property(e => e.MetaDescription).HasColumnName("meta_description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.PublishedAt).HasColumnName("published_at");
        });

        // ProductImage configuration
        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.ToTable("product_images");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Url).HasColumnName("url");
            entity.Property(e => e.AltText).HasColumnName("alt_text");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.Images)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ProductVariant configuration
        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.ToTable("product_variants");
            entity.HasIndex(e => e.Sku).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.Ean).HasColumnName("ean");
            entity.Property(e => e.Price).HasColumnName("price");
            entity.Property(e => e.CompareAtPrice).HasColumnName("compare_at_price");
            entity.Property(e => e.CostPrice).HasColumnName("cost_price");
            entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity");
            entity.Property(e => e.Weight).HasColumnName("weight");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.Options).HasColumnName("options");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.Variants)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ProductAttribute configuration
        modelBuilder.Entity<ProductAttribute>(entity =>
        {
            entity.ToTable("product_attributes");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Value).HasColumnName("value");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.IsVisible).HasColumnName("is_visible");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.Attributes)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Slug).HasColumnName("slug");
            entity.Property(e => e.ParentCategoryId).HasColumnName("parent_category_id");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.ParentCategory)
                  .WithMany(c => c.SubCategories)
                  .HasForeignKey(e => e.ParentCategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Brand configuration
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.ToTable("brands");
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Slug).HasColumnName("slug");
            entity.Property(e => e.LogoUrl).HasColumnName("logo_url");
            entity.Property(e => e.WebsiteUrl).HasColumnName("website_url");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // Supplier configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.ToTable("suppliers");
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.ContactPerson).HasColumnName("contact_person");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.City).HasColumnName("city");
            entity.Property(e => e.PostalCode).HasColumnName("postal_code");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.VatNumber).HasColumnName("vat_number");
            entity.Property(e => e.LeadTimeDays).HasColumnName("lead_time_days");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // Customer configuration
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Company).HasColumnName("company");
            entity.Property(e => e.VatNumber).HasColumnName("vat_number");
            entity.Property(e => e.DefaultShippingAddress).HasColumnName("default_shipping_address");
            entity.Property(e => e.DefaultShippingCity).HasColumnName("default_shipping_city");
            entity.Property(e => e.DefaultShippingPostalCode).HasColumnName("default_shipping_postal_code");
            entity.Property(e => e.DefaultShippingCountry).HasColumnName("default_shipping_country");
            entity.Property(e => e.DefaultBillingAddress).HasColumnName("default_billing_address");
            entity.Property(e => e.DefaultBillingCity).HasColumnName("default_billing_city");
            entity.Property(e => e.DefaultBillingPostalCode).HasColumnName("default_billing_postal_code");
            entity.Property(e => e.DefaultBillingCountry).HasColumnName("default_billing_country");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.AcceptsMarketing).HasColumnName("accepts_marketing");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderNumber).HasColumnName("order_number");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status");
            entity.Property(e => e.Subtotal).HasColumnName("subtotal");
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount");
            entity.Property(e => e.ShippingAmount).HasColumnName("shipping_amount");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.InternalNotes).HasColumnName("internal_notes");
            entity.Property(e => e.ShippingName).HasColumnName("shipping_name");
            entity.Property(e => e.ShippingAddress).HasColumnName("shipping_address");
            entity.Property(e => e.ShippingCity).HasColumnName("shipping_city");
            entity.Property(e => e.ShippingPostalCode).HasColumnName("shipping_postal_code");
            entity.Property(e => e.ShippingCountry).HasColumnName("shipping_country");
            entity.Property(e => e.ShippingPhone).HasColumnName("shipping_phone");
            entity.Property(e => e.BillingName).HasColumnName("billing_name");
            entity.Property(e => e.BillingAddress).HasColumnName("billing_address");
            entity.Property(e => e.BillingCity).HasColumnName("billing_city");
            entity.Property(e => e.BillingPostalCode).HasColumnName("billing_postal_code");
            entity.Property(e => e.BillingCountry).HasColumnName("billing_country");
            entity.Property(e => e.ShippingMethodId).HasColumnName("shipping_method_id");
            entity.Property(e => e.TrackingNumber).HasColumnName("tracking_number");
            entity.Property(e => e.ShippedAt).HasColumnName("shipped_at");
            entity.Property(e => e.DeliveredAt).HasColumnName("delivered_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Orders)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ShippingMethod)
                  .WithMany(s => s.Orders)
                  .HasForeignKey(e => e.ShippingMethodId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // OrderItem configuration
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.ProductName).HasColumnName("product_name");
            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount");
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Order)
                  .WithMany(o => o.Items)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.OrderItems)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Cart configuration
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("carts");
            entity.HasIndex(e => e.SessionId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.Subtotal).HasColumnName("subtotal");
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.CouponCode).HasColumnName("coupon_code");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");

            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Carts)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // CartItem configuration
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.ToTable("cart_items");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CartId).HasColumnName("cart_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Cart)
                  .WithMany(c => c.Items)
                  .HasForeignKey(e => e.CartId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Payment configuration
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasIndex(e => e.TransactionId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.Method).HasColumnName("method");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.GatewayReference).HasColumnName("gateway_reference");
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.ProcessedAt).HasColumnName("processed_at");

            entity.HasOne(e => e.Order)
                  .WithMany(o => o.Payments)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ShippingMethod configuration
        modelBuilder.Entity<ShippingMethod>(entity =>
        {
            entity.ToTable("shipping_methods");
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.Carrier).HasColumnName("carrier");
            entity.Property(e => e.Price).HasColumnName("price");
            entity.Property(e => e.FreeShippingThreshold).HasColumnName("free_shipping_threshold");
            entity.Property(e => e.EstimatedDeliveryDays).HasColumnName("estimated_delivery_days");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.AvailableCountries).HasColumnName("available_countries");
            entity.Property(e => e.MaxWeight).HasColumnName("max_weight");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // Coupon configuration
        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.ToTable("coupons");
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Value).HasColumnName("value");
            entity.Property(e => e.MinimumOrderAmount).HasColumnName("minimum_order_amount");
            entity.Property(e => e.MaximumDiscountAmount).HasColumnName("maximum_discount_amount");
            entity.Property(e => e.UsageLimit).HasColumnName("usage_limit");
            entity.Property(e => e.UsageLimitPerCustomer).HasColumnName("usage_limit_per_customer");
            entity.Property(e => e.UsageCount).HasColumnName("usage_count");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.StartsAt).HasColumnName("starts_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.ApplicableCategories).HasColumnName("applicable_categories");
            entity.Property(e => e.ApplicableProducts).HasColumnName("applicable_products");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // InventoryMovement configuration
        modelBuilder.Entity<InventoryMovement>(entity =>
        {
            entity.ToTable("inventory_movements");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.QuantityBefore).HasColumnName("quantity_before");
            entity.Property(e => e.QuantityAfter).HasColumnName("quantity_after");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // Seed data
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Seed categories
        var electronicsId = Guid.Parse("10000000-0000-0000-0000-000000000001");
        var clothingId = Guid.Parse("10000000-0000-0000-0000-000000000002");
        var booksId = Guid.Parse("10000000-0000-0000-0000-000000000003");

        modelBuilder.Entity<Category>().HasData(
            new Category
            {
                Id = electronicsId,
                Name = "Electronics",
                Slug = "electronics",
                Description = "Electronic devices and accessories",
                IsActive = true,
                SortOrder = 1,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Category
            {
                Id = clothingId,
                Name = "Clothing",
                Slug = "clothing",
                Description = "Apparel and fashion items",
                IsActive = true,
                SortOrder = 2,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Category
            {
                Id = booksId,
                Name = "Books",
                Slug = "books",
                Description = "Books and publications",
                IsActive = true,
                SortOrder = 3,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed shipping methods
        modelBuilder.Entity<ShippingMethod>().HasData(
            new ShippingMethod
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
                Name = "Standard Shipping",
                Code = "STANDARD",
                Carrier = "DHL",
                Description = "5-7 business days",
                Price = 4.99m,
                FreeShippingThreshold = 50m,
                EstimatedDeliveryDays = 7,
                IsActive = true,
                SortOrder = 1,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new ShippingMethod
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000002"),
                Name = "Express Shipping",
                Code = "EXPRESS",
                Carrier = "DHL Express",
                Description = "1-2 business days",
                Price = 12.99m,
                EstimatedDeliveryDays = 2,
                IsActive = true,
                SortOrder = 2,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
