using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Prometheus;
using Minio;
using ShopService.Data;
using ShopService.Services;
using ShopService.GraphQL;

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

    // Ensure database exists and migrations are applied
    app.Logger.LogInformation("Ensuring database is created and migrated...");
    await db.Database.MigrateAsync();
    app.Logger.LogInformation("Database migration completed successfully");

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
