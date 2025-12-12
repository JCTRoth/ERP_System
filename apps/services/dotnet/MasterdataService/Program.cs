using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.Services;
using MasterdataService.GraphQL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Prometheus;

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

// Add Authentication
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
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

// Add GraphQL
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddSubscriptionType<Subscription>()
    .AddTypeExtension<CustomerType>()
    .AddTypeExtension<SupplierType>()
    .AddTypeExtension<EmployeeType>()
    .AddTypeExtension<DepartmentType>()
    .AddTypeExtension<AssetType>()
    .AddTypeExtension<LocationType>()
    .AddFiltering()
    .AddSorting()
    .AddProjections()
    .AddInMemorySubscriptions()
    .AddApolloFederation()
    .AddAuthorization();

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);

// Add CORS
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

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<MasterdataDbContext>();
    dbContext.Database.Migrate();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Prometheus metrics
app.UseHttpMetrics();
app.MapMetrics();

// Health check endpoint
app.MapHealthChecks("/health");

// GraphQL endpoint
app.MapGraphQL();

// WebSocket for subscriptions
app.UseWebSockets();

app.Run();
