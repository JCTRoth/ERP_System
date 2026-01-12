using UserService.Data;
using UserService.Services;
using UserService.GraphQL;
using UserService.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Prometheus;
using BCrypt.Net;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<UserDbContext>(options =>
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
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserServiceImpl>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// GraphQL
builder.Services
    .AddGraphQLServer()
    .AddApolloFederation()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<UserType>()
    .AddType<UserDtoType>()
    .AddFiltering()
    .AddSorting()
    .AddProjections()
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
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);

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

    // Seed test user
    if (!db.Users.Any(u => u.Email == "admin@erp-system.local"))
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
        db.Users.Add(new UserService.Models.User
        {
            Id = Guid.NewGuid(),
            Email = "admin@erp-system.local",
            PasswordHash = passwordHash,
            FirstName = "Admin",
            LastName = "User",
            IsActive = true,
            EmailVerified = true,
            PreferredLanguage = "en"
        });
        db.SaveChanges();
    }
}

app.Run();
