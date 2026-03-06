using UserService.Data;
using UserService.Services;
using UserService.GraphQL;
using UserService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Prometheus;
using BCrypt.Net;
using System.Linq;
using Swashbuckle.AspNetCore.Swagger;
using ServiceDefaults;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<UserDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication
builder.Services.AddJwtAuthenticationFromConfig(builder.Configuration);
builder.Services.AddAuthorization();

// Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserServiceImpl>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISeedDataService, SeedDataService>();

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

// Map GraphQL before authentication to allow introspection
app.MapGraphQL();

app.UseAuthentication();
app.UseAuthorization();

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
