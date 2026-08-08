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
builder.Services.AddScoped<ISeedDataService, SeedDataService>();
// BankAccountService, PaymentRecordService, and ReportingService temporarily disabled due to model mismatches

// Multi-tenancy
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICompanyContext, CompanyContext>();
builder.Services.AddScoped<IRequestAuthorizationService, RequestAuthorizationService>();

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
await InitializeAccountingDatabase(app);

// Recalculate account balances from posted journal entries to ensure correctness
RecalculateAccountBalances(app);

app.Run();

static async Task InitializeAccountingDatabase(WebApplication app)
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

            // Seed extended demo data (invoices, payments, journal entries) — idempotent,
            // applies to fresh and existing databases alike.
            var seedService = scope.ServiceProvider.GetRequiredService<ISeedDataService>();
            await seedService.SeedAsync();

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

static void RecalculateAccountBalances(WebApplication app)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AccountingStartup");

        // Use a plain DbContextOptions without tenant filtering to access all data
        var optionsBuilder = new DbContextOptionsBuilder<AccountingDbContext>();
        optionsBuilder.UseNpgsql(app.Configuration.GetConnectionString("DefaultConnection"));
        using var db = new AccountingDbContext(optionsBuilder.Options);

        var accounts = db.Accounts.AsQueryable();
        if (!accounts.Any())
        {
            logger.LogInformation("No accounts found, skipping balance recalculation");
            return;
        }

        // Sum debits/credits per account from posted journal entries only
        var balances = db.JournalEntryLines
            .Where(l => l.JournalEntry != null &&
                        l.JournalEntry.Status == AccountingService.Models.JournalEntryStatus.Posted)
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(l => l.DebitAmount),
                TotalCredit = g.Sum(l => l.CreditAmount)
            })
            .ToDictionary(x => x.AccountId);

        var updated = 0;
        foreach (var account in accounts)
        {
            decimal newBalance;
            if (balances.TryGetValue(account.Id, out var b))
            {
                // Asset & Expense: balance = debit - credit
                // Liability, Equity & Revenue: balance = credit - debit
                if (account.Type == AccountingService.Models.AccountType.Asset ||
                    account.Type == AccountingService.Models.AccountType.Expense)
                {
                    newBalance = b.TotalDebit - b.TotalCredit;
                }
                else
                {
                    newBalance = b.TotalCredit - b.TotalDebit;
                }
            }
            else
            {
                newBalance = 0;
            }

            if (account.Balance != newBalance)
            {
                logger.LogInformation(
                    "Account {Number} ({Name}): balance {Old} → {New}",
                    account.AccountNumber, account.Name, account.Balance, newBalance);
                account.Balance = newBalance;
                updated++;
            }
        }

        if (updated > 0)
        {
            db.SaveChanges();
            logger.LogInformation("Recalculated {Count} account balances from journal entries", updated);
        }
        else
        {
            logger.LogInformation("All account balances are already correct");
        }
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("AccountingStartup");
        logger.LogWarning(ex, "Failed to recalculate account balances (non-fatal)");
    }
}

public partial class Program { }
