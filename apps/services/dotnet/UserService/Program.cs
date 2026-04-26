using UserService.Data;
using UserService.Services;
using UserService.GraphQL;
using UserService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Prometheus;
using BCrypt.Net;
using System.Linq;
using System.Net.Http.Headers;
using Swashbuckle.AspNetCore.Swagger;
using ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<UserDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication
builder.Services.AddJwtAuthenticationFromConfig(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

// Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserServiceImpl>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISeedDataService, SeedDataService>();
builder.Services.AddScoped<IRequestAuthorizationService, RequestAuthorizationService>();
builder.Services.Configure<CompanyAuthorizationClient.CompanyAuthorizationOptions>(options =>
{
    options.ServiceUrl = builder.Configuration["Services:Company"] ?? "http://company-service:8080/graphql";
    options.InternalApiKey = builder.Configuration["InternalAuth:ApiKey"] ?? "erp-internal-auth-key";
});
builder.Services.AddHttpClient<ICompanyAuthorizationClient, CompanyAuthorizationClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<CompanyAuthorizationClient.CompanyAuthorizationOptions>>().Value;
    var serviceUrl = options.ServiceUrl.TrimEnd('/');
    if (!serviceUrl.EndsWith("/graphql", StringComparison.OrdinalIgnoreCase))
    {
        serviceUrl = $"{serviceUrl}/graphql";
    }

    client.BaseAddress = new Uri(serviceUrl, UriKind.Absolute);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

// GraphQL
builder.Services.AddGraphQLServerDefaults(
    builder.Environment,
    gql => gql
        .AddQueryType<Query>()
        .AddMutationType<Mutation>()
        .AddType<UserType>()
        .AddType<UserDtoType>()
        .AddErrorFilter<ErrorFilter>()
        .AddHttpRequestInterceptor(async (context, executor, builder, cancellationToken) =>
        {
            // Extract user ID from JWT token and set it in global state
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = context.User.FindFirst("sub")?.Value ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdClaim, out var userId))
                {
                    builder.SetGlobalState("CurrentUserId", userId);
                }
            }
            await Task.CompletedTask;
        }));

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Health checks
builder.Services.AddPostgresHealthChecks(builder.Configuration);

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();

// Prometheus metrics
app.UseHttpMetrics();

app.UseAuthentication();
app.UseAuthorization();

app.MapGraphQL();

app.MapHealthChecks("/health");
app.MapMetrics();

// Apply migrations and seed data on startup (dev or when explicitly enabled)
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Database:EnableSeeding", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    db.Database.EnsureCreated();

    // Use SeedDataService to seed demo data
    var seedService = scope.ServiceProvider.GetRequiredService<ISeedDataService>();
    await seedService.SeedAsync();
}

app.Run();
