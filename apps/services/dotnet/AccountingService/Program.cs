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
InitializeAccountingDatabase(app);

app.Run();

static void InitializeAccountingDatabase(WebApplication app)
{
    const int maxAttempts = 12;
    const int delaySeconds = 5;

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AccountingStartup");

        try
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AccountingDbContext>();
            if (!dbContext.Database.IsRelational())
            {
                return;
            }

            if (dbContext.Database.GetMigrations().Any())
            {
                dbContext.Database.Migrate();
            }
            else
            {
                dbContext.Database.EnsureCreated();
            }

            logger.LogInformation("Accounting database initialized on attempt {Attempt}", attempt);
            return;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Accounting database initialization attempt {Attempt}/{MaxAttempts} failed",
                attempt,
                maxAttempts);

            if (attempt == maxAttempts)
            {
                throw;
            }

            Thread.Sleep(TimeSpan.FromSeconds(delaySeconds));
        }
    }
}

public partial class Program { }
