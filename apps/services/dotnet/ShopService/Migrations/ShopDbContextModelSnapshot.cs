using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ShopService.Data;

#nullable disable

namespace ShopService.Migrations
{
    [DbContext(typeof(ShopDbContext))]
    partial class ShopDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            modelBuilder.Entity("ShopService.Models.AuditLog", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("Action")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("action");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<Guid>("EntityId")
                    .HasColumnType("uuid")
                    .HasColumnName("entity_id");

                b.Property<string>("EntityType")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("entity_type");

                b.Property<string>("IpAddress")
                    .HasColumnType("text")
                    .HasColumnName("ip_address");

                b.Property<string>("NewValues")
                    .HasColumnType("text")
                    .HasColumnName("new_values");

                b.Property<string>("OldValues")
                    .HasColumnType("text")
                    .HasColumnName("old_values");

                b.Property<DateTime>("Timestamp")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("timestamp");

                b.Property<Guid>("UserId")
                    .HasColumnType("uuid")
                    .HasColumnName("user_id");

                b.Property<string>("UserEmail")
                    .HasColumnType("text")
                    .HasColumnName("user_email");

                b.Property<string>("UserName")
                    .HasColumnType("text")
                    .HasColumnName("user_name");

                b.HasKey("Id");

                b.HasIndex("EntityId");

                b.HasIndex("EntityType");

                b.HasIndex("Timestamp");

                b.HasIndex("UserId");

                b.ToTable("audit_logs");
            });

            modelBuilder.Entity("ShopService.Models.Brand", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<string>("LogoUrl")
                    .HasColumnType("text")
                    .HasColumnName("logo_url");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<string>("Slug")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("slug");

                b.Property<string>("WebsiteUrl")
                    .HasColumnType("text")
                    .HasColumnName("website_url");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("Slug")
                    .IsUnique();

                b.ToTable("brands");
            });

            modelBuilder.Entity("ShopService.Models.Cart", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<Guid>("CustomerId")
                    .HasColumnType("uuid")
                    .HasColumnName("customer_id");

                b.Property<string>("CouponCode")
                    .HasColumnType("text")
                    .HasColumnName("coupon_code");

                b.Property<decimal>("DiscountAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("discount_amount");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<string>("Currency")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("currency");

                b.Property<DateTime>("ExpiresAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("expires_at");

                b.Property<Guid>("SessionId")
                    .HasColumnType("text")
                    .HasColumnName("session_id");

                b.Property<decimal>("Subtotal")
                    .HasColumnType("numeric")
                    .HasColumnName("subtotal");

                b.Property<decimal>("TaxAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("tax_amount");

                b.Property<decimal>("Total")
                    .HasColumnType("numeric")
                    .HasColumnName("total");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("SessionId");

                b.ToTable("carts");
            });

            modelBuilder.Entity("ShopService.Models.CartItem", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<Guid>("CartId")
                    .HasColumnType("uuid")
                    .HasColumnName("cart_id");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<int>("Quantity")
                    .HasColumnType("integer")
                    .HasColumnName("quantity");

                b.Property<decimal>("Total")
                    .HasColumnType("numeric")
                    .HasColumnName("total");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.Property<decimal>("UnitPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("unit_price");

                b.Property<Guid>("VariantId")
                    .HasColumnType("uuid")
                    .HasColumnName("variant_id");

                b.HasKey("Id");

                b.HasIndex("CartId");

                b.ToTable("cart_items");
            });

            modelBuilder.Entity("ShopService.Models.Category", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<Guid>("ParentCategoryId")
                    .HasColumnType("uuid")
                    .HasColumnName("parent_category_id");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<string>("ImageUrl")
                    .HasColumnType("text")
                    .HasColumnName("image_url");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<string>("Slug")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("slug");

                b.Property<int>("SortOrder")
                    .HasColumnType("integer")
                    .HasColumnName("sort_order");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("ParentCategoryId");

                b.HasIndex("Slug")
                    .IsUnique();

                b.ToTable("categories");
            });

            modelBuilder.Entity("ShopService.Models.Coupon", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("ApplicableCategories")
                    .HasColumnType("text")
                    .HasColumnName("applicable_categories");

                b.Property<string>("ApplicableProducts")
                    .HasColumnType("text")
                    .HasColumnName("applicable_products");

                b.Property<string>("Code")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("code");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<DateTime>("ExpiresAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("expires_at");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<decimal>("MaximumDiscountAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("maximum_discount_amount");

                b.Property<decimal>("MinimumOrderAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("minimum_order_amount");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<DateTime>("StartsAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("starts_at");

                b.Property<string>("Type")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("type");

                b.Property<int>("UsageCount")
                    .HasColumnType("integer")
                    .HasColumnName("usage_count");

                b.Property<int>("UsageLimit")
                    .HasColumnType("integer")
                    .HasColumnName("usage_limit");

                b.Property<int>("UsageLimitPerCustomer")
                    .HasColumnType("integer")
                    .HasColumnName("usage_limit_per_customer");

                b.Property<decimal>("Value")
                    .HasColumnType("numeric")
                    .HasColumnName("value");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("Code")
                    .IsUnique();

                b.ToTable("coupons");
            });

            modelBuilder.Entity("ShopService.Models.Customer", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<bool>("AcceptsMarketing")
                    .HasColumnType("boolean")
                    .HasColumnName("accepts_marketing");

                b.Property<string>("Company")
                    .HasColumnType("text")
                    .HasColumnName("company");

                b.Property<string>("DefaultBillingAddress")
                    .HasColumnType("text")
                    .HasColumnName("default_billing_address");

                b.Property<string>("DefaultBillingCity")
                    .HasColumnType("text")
                    .HasColumnName("default_billing_city");

                b.Property<string>("DefaultBillingCountry")
                    .HasColumnType("text")
                    .HasColumnName("default_billing_country");

                b.Property<string>("DefaultBillingPostalCode")
                    .HasColumnType("text")
                    .HasColumnName("default_billing_postal_code");

                b.Property<string>("DefaultShippingAddress")
                    .HasColumnType("text")
                    .HasColumnName("default_shipping_address");

                b.Property<string>("DefaultShippingCity")
                    .HasColumnType("text")
                    .HasColumnName("default_shipping_city");

                b.Property<string>("DefaultShippingCountry")
                    .HasColumnType("text")
                    .HasColumnName("default_shipping_country");

                b.Property<string>("DefaultShippingPostalCode")
                    .HasColumnType("text")
                    .HasColumnName("default_shipping_postal_code");

                b.Property<string>("Email")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("email");

                b.Property<string>("FirstName")
                    .HasColumnType("text")
                    .HasColumnName("first_name");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<string>("LastName")
                    .HasColumnType("text")
                    .HasColumnName("last_name");

                b.Property<string>("Phone")
                    .HasColumnType("text")
                    .HasColumnName("phone");

                b.Property<string>("Type")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("type");

                b.Property<Guid>("UserId")
                    .HasColumnType("uuid")
                    .HasColumnName("user_id");

                b.Property<string>("VatNumber")
                    .HasColumnType("text")
                    .HasColumnName("vat_number");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("Email")
                    .IsUnique();

                b.ToTable("customers");
            });

            modelBuilder.Entity("ShopService.Models.InventoryMovement", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<Guid>("OrderId")
                    .HasColumnType("uuid")
                    .HasColumnName("order_id");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<int>("Quantity")
                    .HasColumnType("integer")
                    .HasColumnName("quantity");

                b.Property<int>("QuantityAfter")
                    .HasColumnType("integer")
                    .HasColumnName("quantity_after");

                b.Property<int>("QuantityBefore")
                    .HasColumnType("integer")
                    .HasColumnName("quantity_before");

                b.Property<string>("Reason")
                    .HasColumnType("text")
                    .HasColumnName("reason");

                b.Property<string>("Reference")
                    .HasColumnType("text")
                    .HasColumnName("reference");

                b.Property<string>("Type")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("type");

                b.Property<Guid>("UserId")
                    .HasColumnType("uuid")
                    .HasColumnName("user_id");

                b.Property<Guid>("VariantId")
                    .HasColumnType("uuid")
                    .HasColumnName("variant_id");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.HasKey("Id");

                b.ToTable("inventory_movements");
            });

            modelBuilder.Entity("ShopService.Models.Order", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("BillingAddress")
                    .HasColumnType("text")
                    .HasColumnName("billing_address");

                b.Property<string>("BillingCity")
                    .HasColumnType("text")
                    .HasColumnName("billing_city");

                b.Property<string>("BillingCountry")
                    .HasColumnType("text")
                    .HasColumnName("billing_country");

                b.Property<string>("BillingName")
                    .HasColumnType("text")
                    .HasColumnName("billing_name");

                b.Property<string>("BillingPostalCode")
                    .HasColumnType("text")
                    .HasColumnName("billing_postal_code");

                b.Property<Guid>("CustomerId")
                    .HasColumnType("uuid")
                    .HasColumnName("customer_id");

                b.Property<decimal>("DiscountAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("discount_amount");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<string>("Currency")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("currency");

                b.Property<DateTime>("DeliveredAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("delivered_at");

                b.Property<string>("InternalNotes")
                    .HasColumnType("text")
                    .HasColumnName("internal_notes");

                b.Property<string>("InvoiceNumber")
                    .HasColumnType("text")
                    .HasColumnName("invoice_number");

                b.Property<string>("Notes")
                    .HasColumnType("text")
                    .HasColumnName("notes");

                b.Property<string>("OrderNumber")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("order_number");

                b.Property<string>("PaymentRecordIds")
                    .HasColumnType("text")
                    .HasColumnName("payment_record_ids");

                b.Property<int>("PaymentStatus")
                    .HasColumnType("integer")
                    .HasColumnName("payment_status");

                b.Property<Guid>("ShippingMethodId")
                    .HasColumnType("uuid")
                    .HasColumnName("shipping_method_id");

                b.Property<string>("ShippingAddress")
                    .HasColumnType("text")
                    .HasColumnName("shipping_address");

                b.Property<string>("ShippingCity")
                    .HasColumnType("text")
                    .HasColumnName("shipping_city");

                b.Property<string>("ShippingCountry")
                    .HasColumnType("text")
                    .HasColumnName("shipping_country");

                b.Property<string>("ShippingName")
                    .HasColumnType("text")
                    .HasColumnName("shipping_name");

                b.Property<string>("ShippingPhone")
                    .HasColumnType("text")
                    .HasColumnName("shipping_phone");

                b.Property<string>("ShippingPostalCode")
                    .HasColumnType("text")
                    .HasColumnName("shipping_postal_code");

                b.Property<DateTime>("ShippedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("shipped_at");

                b.Property<int>("Status")
                    .HasColumnType("integer")
                    .HasColumnName("status");

                b.Property<decimal>("Subtotal")
                    .HasColumnType("numeric")
                    .HasColumnName("subtotal");

                b.Property<decimal>("TaxAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("tax_amount");

                b.Property<decimal>("Total")
                    .HasColumnType("numeric")
                    .HasColumnName("total");

                b.Property<string>("TrackingNumber")
                    .HasColumnType("text")
                    .HasColumnName("tracking_number");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.Property<decimal>("ShippingAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("shipping_amount");

                b.HasKey("Id");

                b.HasIndex("OrderNumber")
                    .IsUnique();

                b.HasIndex("ShippingMethodId");

                b.ToTable("orders");
            });

            modelBuilder.Entity("ShopService.Models.OrderDocument", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("DocumentType")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("document_type");

                b.Property<DateTime>("GeneratedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("generated_at");

                b.Property<Guid>("OrderId")
                    .HasColumnType("uuid")
                    .HasColumnName("order_id");

                b.Property<string>("PdfUrl")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("pdf_url");

                b.Property<string>("State")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("state");

                b.Property<string>("TemplateId")
                    .HasColumnType("text")
                    .HasColumnName("template_id");

                b.Property<string>("TemplateKey")
                    .HasColumnType("text")
                    .HasColumnName("template_key");

                b.HasKey("Id");

                b.HasIndex("OrderId");

                b.ToTable("order_documents");
            });

            modelBuilder.Entity("ShopService.Models.OrderItem", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<decimal>("DiscountAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("discount_amount");

                b.Property<Guid>("OrderId")
                    .HasColumnType("uuid")
                    .HasColumnName("order_id");

                b.Property<string>("Notes")
                    .HasColumnType("text")
                    .HasColumnName("notes");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<string>("ProductName")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("product_name");

                b.Property<int>("Quantity")
                    .HasColumnType("integer")
                    .HasColumnName("quantity");

                b.Property<string>("Sku")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("sku");

                b.Property<decimal>("TaxAmount")
                    .HasColumnType("numeric")
                    .HasColumnName("tax_amount");

                b.Property<decimal>("Total")
                    .HasColumnType("numeric")
                    .HasColumnName("total");

                b.Property<decimal>("UnitPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("unit_price");

                b.Property<Guid>("VariantId")
                    .HasColumnType("uuid")
                    .HasColumnName("variant_id");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.HasKey("Id");

                b.HasIndex("OrderId");

                b.HasIndex("ProductId");

                b.ToTable("order_items");
            });

            modelBuilder.Entity("ShopService.Models.Payment", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<decimal>("Amount")
                    .HasColumnType("numeric")
                    .HasColumnName("amount");

                b.Property<string>("Currency")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("currency");

                b.Property<string>("ErrorMessage")
                    .HasColumnType("text")
                    .HasColumnName("error_message");

                b.Property<string>("GatewayReference")
                    .HasColumnType("text")
                    .HasColumnName("gateway_reference");

                b.Property<string>("Method")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("method");

                b.Property<Guid>("OrderId")
                    .HasColumnType("uuid")
                    .HasColumnName("order_id");

                b.Property<DateTime>("ProcessedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("processed_at");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("status");

                b.Property<string>("TransactionId")
                    .HasColumnType("text")
                    .HasColumnName("transaction_id");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.HasKey("Id");

                b.HasIndex("OrderId");

                b.HasIndex("TransactionId");

                b.ToTable("payments");
            });

            modelBuilder.Entity("ShopService.Models.Product", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<bool>("AllowBackorder")
                    .HasColumnType("boolean")
                    .HasColumnName("allow_backorder");

                b.Property<Guid>("BrandId")
                    .HasColumnType("uuid")
                    .HasColumnName("brand_id");

                b.Property<Guid>("CategoryId")
                    .HasColumnType("uuid")
                    .HasColumnName("category_id");

                b.Property<decimal>("CompareAtPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("compare_at_price");

                b.Property<decimal>("CostPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("cost_price");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<string>("DimensionUnit")
                    .HasColumnType("text")
                    .HasColumnName("dimension_unit");

                b.Property<string>("Ean")
                    .HasColumnType("text")
                    .HasColumnName("ean");

                b.Property<decimal>("Height")
                    .HasColumnType("numeric")
                    .HasColumnName("height");

                b.Property<bool>("IsDigital")
                    .HasColumnType("boolean")
                    .HasColumnName("is_digital");

                b.Property<bool>("IsFeatured")
                    .HasColumnType("boolean")
                    .HasColumnName("is_featured");

                b.Property<decimal>("Length")
                    .HasColumnType("numeric")
                    .HasColumnName("length");

                b.Property<int>("LowStockThreshold")
                    .HasColumnType("integer")
                    .HasColumnName("low_stock_threshold");

                b.Property<string>("MetaDescription")
                    .HasColumnType("text")
                    .HasColumnName("meta_description");

                b.Property<string>("MetaTitle")
                    .HasColumnType("text")
                    .HasColumnName("meta_title");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<DateTime>("PublishedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("published_at");

                b.Property<decimal>("Price")
                    .HasColumnType("numeric")
                    .HasColumnName("price");

                b.Property<Guid>("SupplierId")
                    .HasColumnType("uuid")
                    .HasColumnName("supplier_id");

                b.Property<string>("Slug")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("slug");

                b.Property<int>("StockQuantity")
                    .HasColumnType("integer")
                    .HasColumnName("stock_quantity");

                b.Property<int>("Status")
                    .HasColumnType("integer")
                    .HasColumnName("status");

                b.Property<bool>("TrackInventory")
                    .HasColumnType("boolean")
                    .HasColumnName("track_inventory");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.Property<decimal>("Weight")
                    .HasColumnType("numeric")
                    .HasColumnName("weight");

                b.Property<string>("WeightUnit")
                    .HasColumnType("text")
                    .HasColumnName("weight_unit");

                b.Property<decimal>("Width")
                    .HasColumnType("numeric")
                    .HasColumnName("width");

                b.HasKey("Id");

                b.HasIndex("Sku")
                    .IsUnique();

                b.HasIndex("Slug")
                    .IsUnique();

                b.ToTable("products");
            });

            modelBuilder.Entity("ShopService.Models.ProductAttribute", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<bool>("IsVisible")
                    .HasColumnType("boolean")
                    .HasColumnName("is_visible");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<int>("SortOrder")
                    .HasColumnType("integer")
                    .HasColumnName("sort_order");

                b.Property<string>("Value")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("value");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.HasKey("Id");

                b.HasIndex("ProductId");

                b.ToTable("product_attributes");
            });

            modelBuilder.Entity("ShopService.Models.ProductImage", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("AltText")
                    .HasColumnType("text")
                    .HasColumnName("alt_text");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<bool>("IsPrimary")
                    .HasColumnType("boolean")
                    .HasColumnName("is_primary");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<int>("SortOrder")
                    .HasColumnType("integer")
                    .HasColumnName("sort_order");

                b.Property<string>("Url")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("url");

                b.HasKey("Id");

                b.HasIndex("ProductId");

                b.ToTable("product_images");
            });

            modelBuilder.Entity("ShopService.Models.ProductVariant", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<string>("ImageUrl")
                    .HasColumnType("text")
                    .HasColumnName("image_url");

                b.Property<string>("Name")
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<string>("Options")
                    .HasColumnType("text")
                    .HasColumnName("options");

                b.Property<Guid>("ProductId")
                    .HasColumnType("uuid")
                    .HasColumnName("product_id");

                b.Property<decimal>("Price")
                    .HasColumnType("numeric")
                    .HasColumnName("price");

                b.Property<decimal>("CompareAtPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("compare_at_price");

                b.Property<decimal>("CostPrice")
                    .HasColumnType("numeric")
                    .HasColumnName("cost_price");

                b.Property<string>("Sku")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("sku");

                b.Property<string>("Ean")
                    .HasColumnType("text")
                    .HasColumnName("ean");

                b.Property<int>("StockQuantity")
                    .HasColumnType("integer")
                    .HasColumnName("stock_quantity");

                b.Property<decimal>("Weight")
                    .HasColumnType("numeric")
                    .HasColumnName("weight");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("ProductId");

                b.HasIndex("Sku")
                    .IsUnique();

                b.ToTable("product_variants");
            });

            modelBuilder.Entity("ShopService.Models.ShippingMethod", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("AvailableCountries")
                    .HasColumnType("text")
                    .HasColumnName("available_countries");

                b.Property<string>("Carrier")
                    .HasColumnType("text")
                    .HasColumnName("carrier");

                b.Property<string>("Code")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("code");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<string>("Description")
                    .HasColumnType("text")
                    .HasColumnName("description");

                b.Property<int>("EstimatedDeliveryDays")
                    .HasColumnType("integer")
                    .HasColumnName("estimated_delivery_days");

                b.Property<decimal>("FreeShippingThreshold")
                    .HasColumnType("numeric")
                    .HasColumnName("free_shipping_threshold");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<decimal>("MaxWeight")
                    .HasColumnType("numeric")
                    .HasColumnName("max_weight");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<decimal>("Price")
                    .HasColumnType("numeric")
                    .HasColumnName("price");

                b.Property<int>("SortOrder")
                    .HasColumnType("integer")
                    .HasColumnName("sort_order");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.HasKey("Id");

                b.HasIndex("Code")
                    .IsUnique();

                b.ToTable("shipping_methods");
            });

            modelBuilder.Entity("ShopService.Models.Supplier", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b.Property<string>("Address")
                    .HasColumnType("text")
                    .HasColumnName("address");

                b.Property<string>("City")
                    .HasColumnType("text")
                    .HasColumnName("city");

                b.Property<string>("Code")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("code");

                b.Property<string>("ContactPerson")
                    .HasColumnType("text")
                    .HasColumnName("contact_person");

                b.Property<string>("Country")
                    .HasColumnType("text")
                    .HasColumnName("country");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("created_at");

                b.Property<string>("Currency")
                    .HasColumnType("text")
                    .HasColumnName("currency");

                b.Property<string>("Email")
                    .HasColumnType("text")
                    .HasColumnName("email");

                b.Property<int>("LeadTimeDays")
                    .HasColumnType("integer")
                    .HasColumnName("lead_time_days");

                b.Property<bool>("IsActive")
                    .HasColumnType("boolean")
                    .HasColumnName("is_active");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasColumnType("text")
                    .HasColumnName("name");

                b.Property<string>("Phone")
                    .HasColumnType("text")
                    .HasColumnName("phone");

                b.Property<string>("PostalCode")
                    .HasColumnType("text")
                    .HasColumnName("postal_code");

                b.Property<DateTime>("UpdatedAt")
                    .HasColumnType("timestamp with time zone")
                    .HasColumnName("updated_at");

                b.Property<string>("VatNumber")
                    .HasColumnType("text")
                    .HasColumnName("vat_number");

                b.HasKey("Id");

                b.HasIndex("Code")
                    .IsUnique();

                b.ToTable("suppliers");
            });

            modelBuilder.Entity("ShopService.Models.AuditLog", b =>
            {
                b.HasOne("ShopService.Models.Category", null)
                    .WithMany()
                    .HasForeignKey("EntityId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.Category", b =>
            {
                b.HasOne("ShopService.Models.Category", "ParentCategory")
                    .WithMany("SubCategories")
                    .HasForeignKey("ParentCategoryId")
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity("ShopService.Models.CartItem", b =>
            {
                b.HasOne("ShopService.Models.Cart", "Cart")
                    .WithMany("Items")
                    .HasForeignKey("CartId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.Order", b =>
            {
                b.HasOne("ShopService.Models.ShippingMethod", "ShippingMethod")
                    .WithMany("Orders")
                    .HasForeignKey("ShippingMethodId")
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity("ShopService.Models.OrderDocument", b =>
            {
                b.HasOne("ShopService.Models.Order", "Order")
                    .WithMany("Documents")
                    .HasForeignKey("OrderId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.OrderItem", b =>
            {
                b.HasOne("ShopService.Models.Order", "Order")
                    .WithMany("Items")
                    .HasForeignKey("OrderId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.HasOne("ShopService.Models.Product", "Product")
                    .WithMany("OrderItems")
                    .HasForeignKey("ProductId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.Payment", b =>
            {
                b.HasOne("ShopService.Models.Order", "Order")
                    .WithMany("Payments")
                    .HasForeignKey("OrderId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.Product", b =>
            {
                b.HasOne("ShopService.Models.Brand", "Brand")
                    .WithMany()
                    .HasForeignKey("BrandId");

                b.HasOne("ShopService.Models.Category", "Category")
                    .WithMany()
                    .HasForeignKey("CategoryId");

                b.HasOne("ShopService.Models.Supplier", "Supplier")
                    .WithMany()
                    .HasForeignKey("SupplierId");
            });

            modelBuilder.Entity("ShopService.Models.ProductAttribute", b =>
            {
                b.HasOne("ShopService.Models.Product", "Product")
                    .WithMany("Attributes")
                    .HasForeignKey("ProductId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.ProductImage", b =>
            {
                b.HasOne("ShopService.Models.Product", "Product")
                    .WithMany("Images")
                    .HasForeignKey("ProductId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.ProductVariant", b =>
            {
                b.HasOne("ShopService.Models.Product", "Product")
                    .WithMany("Variants")
                    .HasForeignKey("ProductId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });

            modelBuilder.Entity("ShopService.Models.ShippingMethod", b =>
            {
                b.HasMany("ShopService.Models.Order", "Orders")
                    .WithOne("ShippingMethod")
                    .HasForeignKey("ShippingMethodId")
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}