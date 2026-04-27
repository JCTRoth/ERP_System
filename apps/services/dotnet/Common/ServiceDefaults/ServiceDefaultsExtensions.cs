using HotChocolate.Execution.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace ServiceDefaults;

public record GraphQlDefaults(
    int? MaxTypeCost = null,
    int? MaxFieldCost = null,
    int? MaxExecutionDepth = null,
    int? MaxPageSize = null,
    int? DefaultPageSize = null,
    bool? RequirePagingBoundaries = null,
    bool? IncludeExceptionDetails = null);

public static class ServiceDefaultsExtensions
{
    public static IServiceCollection AddDefaultCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader());
        });

        return services;
    }

    public static AuthenticationBuilder AddJwtAuthenticationFromConfig(
        this IServiceCollection services,
        IConfiguration configuration,
        string scheme = JwtBearerDefaults.AuthenticationScheme)
    {
        var jwtKey = configuration["Jwt:Key"] ?? configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException("JWT Key not configured (set Jwt:Key or Jwt:Secret)");
        }

        return services.AddAuthentication(scheme)
            .AddJwtBearer(scheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
            });
    }

    public static IHealthChecksBuilder AddPostgresHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration,
        string connectionName = "DefaultConnection")
    {
        var connectionString = configuration.GetConnectionString(connectionName);
        var builder = services.AddHealthChecks();

        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            builder.AddNpgSql(connectionString);
        }

        return builder;
    }

    public static IRequestExecutorBuilder AddGraphQLServerDefaults(
        this IServiceCollection services,
        IWebHostEnvironment environment,
        Action<IRequestExecutorBuilder> configure,
        GraphQlDefaults? defaults = null)
    {
        var gql = services
            .AddGraphQLServer()
            .AddAuthorization()
            .AddApolloFederation()
            .AddFiltering()
            .AddSorting()
            .AddProjections()
            .AddInMemorySubscriptions()
            .ModifyRequestOptions(opt =>
            {
                opt.IncludeExceptionDetails = defaults?.IncludeExceptionDetails ?? environment.IsDevelopment();
            });

        if (defaults?.MaxFieldCost is int maxFieldCost)
        {
            gql.ModifyCostOptions(o => o.MaxFieldCost = maxFieldCost);
        }

        if (defaults?.MaxTypeCost is int maxTypeCost)
        {
            gql.ModifyCostOptions(o => o.MaxTypeCost = maxTypeCost);
        }

        if (defaults?.MaxExecutionDepth is int maxExecutionDepth)
        {
            gql.AddMaxExecutionDepthRule(maxExecutionDepth);
        }

        if (defaults?.MaxPageSize is int maxPageSize ||
            defaults?.DefaultPageSize is int defaultPageSize ||
            defaults?.RequirePagingBoundaries is bool requirePagingBoundaries)
        {
            gql.ModifyPagingOptions(o =>
            {
                if (defaults?.MaxPageSize is int maxPageSizeValue)
                {
                    o.MaxPageSize = maxPageSizeValue;
                }

                if (defaults?.DefaultPageSize is int defaultPageSizeValue)
                {
                    o.DefaultPageSize = defaultPageSizeValue;
                }

                if (defaults?.RequirePagingBoundaries is bool requirePagingBoundariesValue)
                {
                    o.RequirePagingBoundaries = requirePagingBoundariesValue;
                }
            });
        }

        configure(gql);
        return gql;
    }
}
