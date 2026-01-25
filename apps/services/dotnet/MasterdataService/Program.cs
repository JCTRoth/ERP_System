using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.Services;
using MasterdataService.GraphQL;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Prometheus;
using Models = MasterdataService.Models;

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
    .AddType<CustomerObjectType>()
    .AddType<AddressObjectType>()
    .AddType<ContactObjectType>()
    .AddType<CurrencyObjectType>()
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
    .AddAuthorization()
    .ModifyCostOptions(options =>
    {
        // Relax cost limits for development to allow richer queries
        options.MaxTypeCost = 500000;
        options.MaxFieldCost = 500000;
    })
    .ModifyPagingOptions(options =>
    {
        options.MaxPageSize = 5000;
        options.DefaultPageSize = 50;
        options.RequirePagingBoundaries = false;
    });

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);

// Add Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// Apply migrations on startup (only for relational databases)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<MasterdataDbContext>();
        if (dbContext.Database.IsRelational())
        {
            // For development, ensure the database is created
            dbContext.Database.EnsureCreated();
            
            // Update tax codes to German VAT rates (development only)
            var taxCodes = dbContext.TaxCodes.ToList();
            if (taxCodes.Any())
            {
                var stdTax = taxCodes.FirstOrDefault(t => t.Code == "STD");
                if (stdTax != null && stdTax.Rate != 19m)
                {
                    stdTax.Rate = 19m;
                    stdTax.Description = "Standard sales tax (19%)";
                }
                
                var reducedTax = taxCodes.FirstOrDefault(t => t.Code == "REDUCED");
                if (reducedTax != null && reducedTax.Rate != 7m)
                {
                    reducedTax.Rate = 7m;
                    reducedTax.Description = "Reduced sales tax (7%)";
                }
                
                // Add REDUCED2 if it doesn't exist
                if (!taxCodes.Any(t => t.Code == "REDUCED2"))
                {
                    dbContext.TaxCodes.Add(new Models.TaxCode 
                    { 
                        Id = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f"), 
                        Code = "REDUCED2", 
                        Name = "Reduced Rate 2", 
                        Description = "Reduced sales tax (16%)", 
                        Rate = 16m, 
                        Type = Models.TaxType.Sales, 
                        IsActive = true, 
                        EffectiveFrom = DateTime.UtcNow, 
                        CreatedAt = DateTime.UtcNow 
                    });
                }
                else
                {
                    var reduced2Tax = taxCodes.FirstOrDefault(t => t.Code == "REDUCED2");
                    if (reduced2Tax != null && reduced2Tax.Rate != 16m)
                    {
                        reduced2Tax.Rate = 16m;
                        reduced2Tax.Description = "Reduced sales tax (16%)";
                    }
                }
                
                dbContext.SaveChanges();
            }
        }
    }
    catch (Exception ex)
    {
        // Log the error but don't fail startup - database might not be ready yet
        Console.WriteLine($"Database initialization failed: {ex.Message}");
        Console.WriteLine("Service will continue without database initialization. Database operations will be retried on first request.");
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
