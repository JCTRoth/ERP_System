using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using ServiceDefaults;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;
using static UserService.Services.PlatformRoleHelper;

namespace UserService.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateAccessToken(User user, AuthorizationContextDto? authorizationContext = null);
    Task<RefreshToken> GenerateRefreshTokenAsync(Guid userId);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    private readonly UserDbContext _context;

    public TokenService(IConfiguration configuration, UserDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    public (string Token, DateTime ExpiresAt) GenerateAccessToken(User user, AuthorizationContextDto? authorizationContext = null)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? _configuration["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60");
        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);
        var platformRole = NormalizePlatformRole(user.Role);
        var isGlobalSuperAdmin = string.Equals(platformRole, "SUPER_ADMIN", StringComparison.OrdinalIgnoreCase);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim("preferred_language", user.PreferredLanguage ?? "en"),
            new Claim(ClaimsPrincipalAuthorizationExtensions.PlatformRoleClaim, platformRole),
            new Claim(ClaimTypes.Role, platformRole),
            new Claim(ClaimsPrincipalAuthorizationExtensions.IsGlobalSuperAdminClaim, isGlobalSuperAdmin.ToString().ToLowerInvariant()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (authorizationContext is not null)
        {
            claims.Add(new Claim(ClaimsPrincipalAuthorizationExtensions.CompanyIdClaim, authorizationContext.CompanyId.ToString()));

            if (!string.IsNullOrWhiteSpace(authorizationContext.CompanyRole))
            {
                claims.Add(new Claim(ClaimsPrincipalAuthorizationExtensions.CompanyRoleClaim, authorizationContext.CompanyRole));
            }

            foreach (var groupCode in authorizationContext.GroupCodes.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                claims.Add(new Claim(ClaimsPrincipalAuthorizationExtensions.GroupCodeClaim, groupCode));
            }

            foreach (var permissionCode in authorizationContext.PermissionCodes.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                claims.Add(new Claim(ClaimsPrincipalAuthorizationExtensions.PermissionCodeClaim, permissionCode));
            }

            if (authorizationContext.ScopeGrants.Count > 0)
            {
                claims.Add(new Claim("scope_grants", JsonSerializer.Serialize(authorizationContext.ScopeGrants)));
            }
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public async Task<RefreshToken> GenerateRefreshTokenAsync(Guid userId)
    {
        var expirationDays = int.Parse(_configuration["Jwt:RefreshExpirationDays"] ?? "7");
        
        var refreshToken = new RefreshToken
        {
            Token = GenerateSecureToken(),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(expirationDays)
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    private static string GenerateSecureToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
