using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Prometheus;
using Minio;
using ShopService.Data;
using ShopService.Services;
using ShopService.GraphQL;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<ShopDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? builder.Configuration["Jwt:Secret"] 
    ?? throw new InvalidOperationException("JWT Key not configured (set Jwt:Key or Jwt:Secret)");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

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
builder.Services
    .AddGraphQLServer()
    .AddApolloFederation()
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
    .AddFiltering()
    .AddSorting()
    .AddProjections()
    .AddInMemorySubscriptions()
    .ModifyPagingOptions(opt =>
    {
        opt.MaxPageSize = 50;
        opt.DefaultPageSize = 20;
        opt.IncludeTotalCount = true;
    })
    .AddMaxExecutionDepthRule(15)
    .ModifyCostOptions(opt =>
    {
        opt.MaxFieldCost = 10000;
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Controllers
builder.Services.AddControllers();

// Health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

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

// Apply migrations and seed data on startup
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

app.Run();

public partial class Program { }
