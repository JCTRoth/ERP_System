using Microsoft.EntityFrameworkCore;
using Prometheus;
using Minio;
using ShopService.Data;
using ShopService.Services;
using ShopService.GraphQL;
using Npgsql;
using ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Database
builder.Services.AddDbContext<ShopDbContext>(options =>
{
    options.UseNpgsql(defaultConnectionString
        ?? "Host=localhost;Port=5432;Database=shopdb;Username=postgres;Password=postgres");
});

// Authentication
builder.Services.AddJwtAuthenticationFromConfig(builder.Configuration);
builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IBrandService, BrandService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderJobProcessor, OrderJobProcessor>();
builder.Services.AddScoped<IOrderPaymentService, OrderPaymentService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ICouponService, CouponService>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<ISeedDataService, SeedDataService>();

// Multi-tenancy
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICompanyContext, CompanyContext>();

// MinIO S3 client
builder.Services.AddMinio(configureClient => configureClient
    .WithEndpoint(builder.Configuration.GetValue<string>("Minio:Endpoint") ?? "minio:9000")
    .WithCredentials(
        builder.Configuration.GetValue<string>("Minio:AccessKey") ?? "minioadmin",
        builder.Configuration.GetValue<string>("Minio:SecretKey") ?? "minioadmin")
    .WithSSL(builder.Configuration.GetValue<bool>("Minio:UseSSL"))
    .WithRegion("us-east-1"));

builder.Services.AddScoped<MinioStorageService>();

// Background job processor hosted service
builder.Services.AddHostedService<OrderJobProcessorHostedService>();

// HTTP Clients for service-to-service communication
builder.Services.AddHttpClient<TemplatesServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration.GetValue<string>("Services:TemplatesService") 
        ?? "http://templates-service:8087");
    client.Timeout = TimeSpan.FromMinutes(5); // allow longer PDF generation time
});

builder.Services.AddHttpClient<AccountingServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration.GetValue<string>("Services:Gateway") 
        ?? "http://gateway:4000");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient<NotificationServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration.GetValue<string>("Services:Gateway") 
        ?? "http://gateway:4000");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// GraphQL
builder.Services.AddGraphQLServerDefaults(
    builder.Environment,
    gql => gql
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddSubscriptionType<Subscription>()
        .AddType<ProductType>()
        .AddType<OrderDocumentType>()
        .AddType<OrderType>()
        .AddType<OrderItemType>()
        .AddType<CartType>()
        .AddType<PaymentType>()
        .AddType<AddressType>()
        .AddType<UserType>()
        .AddType<SupplierType>()
        .AddType<AuditLogType>()
        .ModifyPagingOptions(opt =>
        {
            opt.IncludeTotalCount = true;
        }),
    new GraphQlDefaults(
        MaxFieldCost: 10000,
        MaxExecutionDepth: 15,
        MaxPageSize: 50,
        DefaultPageSize: 20));

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Controllers
builder.Services.AddControllers();

// Health checks
builder.Services.AddPostgresHealthChecks(builder.Configuration);

// CORS
builder.Services.AddDefaultCors();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors();

// Prometheus metrics
app.UseHttpMetrics();

app.UseAuthentication();
app.UseAuthorization();

app.UseWebSockets();
app.MapGraphQL();
app.MapControllers();
app.MapHealthChecks("/health");
app.MapMetrics();

var skipDatabaseInitialization = app.Environment.IsEnvironment("Testing") ||
    builder.Configuration.GetValue<bool>("SkipDatabaseInitialization", false);

// Apply migrations and seed data on startup
if (skipDatabaseInitialization)
{
    app.Logger.LogInformation("Skipping database initialization for test environment or configuration override");
}
else
{
    app.Logger.LogInformation("Initializing database...");
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
        var seedService = scope.ServiceProvider.GetRequiredService<ISeedDataService>();

        // Wait for DNS resolution to be available
        app.Logger.LogInformation("Waiting for DNS resolution to be available...");
        const int maxRetries = 10;
        const int delayMs = 2000;
        bool dnsResolved = false;

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                // Use postgres database for DNS check since shopdb might not exist yet
                var testConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")!
                    .Replace("Database=shopdb", "Database=postgres");
                using var testConnection = new NpgsqlConnection(testConnectionString);
                await testConnection.OpenAsync();
                testConnection.Close();
                dnsResolved = true;
                app.Logger.LogInformation("DNS resolution successful");
                break;
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, $"DNS resolution attempt {i + 1}/{maxRetries} failed, retrying in {delayMs}ms...");
                await Task.Delay(delayMs);
            }
        }

        if (!dnsResolved)
        {
            throw new Exception("Failed to resolve DNS after all retries");
        }

        // Ensure database exists and tables are created
        app.Logger.LogInformation("Ensuring database is created and migrated...");
        try
        {
            app.Logger.LogInformation("Dropping existing database to ensure clean schema...");
            try
            {
                // Drop and recreate the database to ensure schema is correct
                await db.Database.EnsureDeletedAsync();
                app.Logger.LogInformation("Dropped existing database");
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, "Failed to drop database, attempting to continue...");
            }

            app.Logger.LogInformation("Creating database with correct schema...");
            var created = await db.Database.EnsureCreatedAsync();
            if (created)
            {
                app.Logger.LogInformation("Database created successfully");
            }
            else
            {
                app.Logger.LogInformation("Database already exists, verifying schema...");
            }

            app.Logger.LogInformation("Database creation completed successfully");
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Failed to create database schema");
            throw;
        }

        // Always attempt to seed data (the SeedDataService handles checking for existing data)
        app.Logger.LogInformation("Checking and seeding initial data...");
        await seedService.SeedAsync();
        app.Logger.LogInformation("Database initialization completed successfully");

    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Failed to initialize database");
        throw;
    }
}

app.Run();

public partial class Program { }
