using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.Services;
using MasterdataService.GraphQL;
using Prometheus;
using ServiceDefaults;
using Models = MasterdataService.Models;
using MasterdataService;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
builder.Services.AddDbContext<MasterdataDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<ICostCenterService, CostCenterService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<IAssetCategoryService, AssetCategoryService>();
builder.Services.AddScoped<IReferenceDataService, ReferenceDataService>();

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
        .AddType<CustomerObjectType>()
        .AddType<AddressObjectType>()
        .AddType<ContactObjectType>()
        .AddType<CurrencyObjectType>()
        .AddTypeExtension<SupplierType>()
        .AddTypeExtension<EmployeeType>()
        .AddTypeExtension<DepartmentType>()
        .AddTypeExtension<AssetType>()
        .AddTypeExtension<LocationType>(),
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

var skipDatabaseInitialization = app.Environment.IsEnvironment("Testing") ||
    builder.Configuration.GetValue<bool>("SkipDatabaseInitialization", false);

// Apply migrations on startup (only for relational databases)
if (!skipDatabaseInitialization)
{
    MasterdataInitializer.InitializeDatabase(app);
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
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Masterdata API V1");
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
