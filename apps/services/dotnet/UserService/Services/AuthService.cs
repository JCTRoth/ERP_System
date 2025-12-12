using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;

namespace UserService.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(Guid userId, string refreshToken);
    Task<UserDto?> RegisterAsync(RegisterRequest request);
}

public class AuthService : IAuthService
{
    private readonly UserDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(UserDbContext context, ITokenService tokenService, ILogger<AuthService> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
            return null;
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt for inactive user: {Email}", request.Email);
            return null;
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;

        // Generate tokens
        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user);
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

        await _context.SaveChangesAsync();

        _logger.LogInformation("User logged in: {Email}", user.Email);

        return new LoginResponse(
            accessToken,
            refreshToken.Token,
            expiresAt,
            ToDto(user)
        );
    }

    public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token == null || !token.IsActive)
        {
            _logger.LogWarning("Invalid refresh token attempt");
            return null;
        }

        // Revoke old token
        token.IsRevoked = true;
        token.RevokedReason = "Replaced by new token";

        // Generate new tokens
        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(token.User);
        var newRefreshToken = await _tokenService.GenerateRefreshTokenAsync(token.UserId);

        await _context.SaveChangesAsync();

        return new LoginResponse(
            accessToken,
            newRefreshToken.Token,
            expiresAt,
            ToDto(token.User)
        );
    }

    public async Task<bool> LogoutAsync(Guid userId, string refreshToken)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken && t.UserId == userId);

        if (token == null)
            return false;

        token.IsRevoked = true;
        token.RevokedReason = "User logout";
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<UserDto?> RegisterAsync(RegisterRequest request)
    {
        // Check if email exists
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            _logger.LogWarning("Registration attempt with existing email: {Email}", request.Email);
            return null;
        }

        var user = new User
        {
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            PreferredLanguage = request.PreferredLanguage ?? "en",
            IsActive = true,
            EmailVerified = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New user registered: {Email}", user.Email);

        return ToDto(user);
    }

    private static UserDto ToDto(User user) => new(
        user.Id,
        user.Email,
        user.FirstName,
        user.LastName,
        user.FullName,
        user.IsActive,
        user.EmailVerified,
        user.PreferredLanguage,
        user.CreatedAt,
        user.LastLoginAt
    );
}
