using AccountingService.Data;
using AccountingService.GraphQL;
using AccountingService.Services;
using ICompanyContext = AccountingService.Services.ICompanyContext;
using Microsoft.EntityFrameworkCore;
using Prometheus;
using ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AccountingDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));

    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors();
        options.EnableSensitiveDataLogging();
    }
});

// Register application services
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IJournalEntryService, JournalEntryService>();
// BankAccountService, PaymentRecordService, and ReportingService temporarily disabled due to model mismatches

// Multi-tenancy
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICompanyContext, CompanyContext>();

// Configure JWT Authentication
builder.Services.AddJwtAuthenticationFromConfig(builder.Configuration);
builder.Services.AddAuthorization();

// Configure GraphQL
builder.Services.AddGraphQLServerDefaults(
    builder.Environment,
    gql => gql
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddSubscriptionType<Subscription>()
        .AddTypeExtension<AccountType>()
        .AddTypeExtension<InvoiceType>()
        .AddTypeExtension<JournalEntryType>()
        .AddTypeExtension<JournalEntryLineType>()
        .AddTypeExtension<PaymentRecordType>()
        .AddTypeExtension<BankAccountType>(),
    new GraphQlDefaults(
        MaxFieldCost: 250000,
        MaxTypeCost: 250000,
        MaxPageSize: 5000,
        DefaultPageSize: 50,
        RequirePagingBoundaries: false));

// Add health checks
builder.Services.AddPostgresHealthChecks(builder.Configuration);

// Add Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddDefaultCors();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Enable Swagger UI in development for API exploration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Accounting API V1");
        options.RoutePrefix = "swagger"; // Serve swagger at /swagger
    });
}

app.UseCors();

// Prometheus metrics endpoint
app.UseMetricServer();
app.UseHttpMetrics();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.UseWebSockets();

app.MapGraphQL("/graphql");
app.MapControllers();
app.MapHealthChecks("/health");

// Apply migrations or create database on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AccountingDbContext>();
    if (dbContext.Database.IsRelational())
    {
        try
        {
            // If migrations are defined, apply them; otherwise ensure the schema is created
            if (dbContext.Database.GetMigrations().Any())
            {
                dbContext.Database.Migrate();
            }
            else
            {
                dbContext.Database.EnsureCreated();
            }
            
            // Update invoice customer name (development only)
            var invoice = dbContext.Invoices.FirstOrDefault(i => i.InvoiceNumber == "INV-2026-0001");
            if (invoice != null && invoice.CustomerName != "Jonas Roth")
            {
                invoice.CustomerName = "Jonas Roth";
                dbContext.SaveChanges();
            }
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(ex, "Database initialization failed, database may already exist or connection unavailable");
        }
    }
}

app.Run();

public partial class Program { }
