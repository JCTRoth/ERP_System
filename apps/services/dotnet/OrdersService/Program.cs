using Microsoft.EntityFrameworkCore;
using OrdersService.Data;
using OrdersService.Services;
using OrdersService.GraphQL;
using Prometheus;
using OrdersService.Services;
using Models = OrdersService.Models;
using ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
builder.Services.AddDbContext<OrdersDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Services
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderItemService, OrderItemService>();

// Multi-tenancy
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICompanyContext, CompanyContext>();

// Add Authentication
builder.Services.AddJwtAuthenticationFromConfig(builder.Configuration);
builder.Services.AddAuthorization();

// Add GraphQL
builder.Services.AddGraphQLServerDefaults(
    builder.Environment,
    gql => gql
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddSubscriptionType<Subscription>()
        .AddType<OrderObjectType>()
        .AddType<OrderItemObjectType>(),
    new GraphQlDefaults(
        MaxTypeCost: 500000,
        MaxFieldCost: 500000,
        MaxPageSize: 5000,
        DefaultPageSize: 50,
        RequirePagingBoundaries: false));

// Add Health Checks
builder.Services.AddPostgresHealthChecks(builder.Configuration);

// Add Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddDefaultCors();

var app = builder.Build();

// Apply migrations on startup (only for relational databases)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();
    if (dbContext.Database.IsRelational())
    {
        // For development, ensure the database is created
        dbContext.Database.EnsureCreated();
    }
}

app.UseRouting();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Prometheus metrics
app.UseHttpMetrics();
app.MapMetrics();

// Enable Swagger UI (development and dev compose) for API exploration
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Orders API V1");
    options.RoutePrefix = "swagger"; // Serve swagger at /swagger
});

// Health check endpoint
app.MapHealthChecks("/health");

// Controllers
app.MapControllers();

// GraphQL endpoint
app.MapGraphQL();

// WebSocket for subscriptions
app.UseWebSockets();

app.Run();

public partial class Program { }
