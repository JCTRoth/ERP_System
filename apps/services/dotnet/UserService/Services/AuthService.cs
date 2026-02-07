using Microsoft.EntityFrameworkCore;
using System.Linq;
using BCrypt.Net;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;
using UserService.Exceptions;

namespace UserService.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse?> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(Guid userId, string refreshToken);
    Task<UserDto?> RegisterAsync(RegisterRequest request);
    Task<bool> RequestPasswordResetAsync(RequestPasswordResetRequest request);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    Task<bool> VerifyEmailAsync(string token);
}

public class AuthService : IAuthService
{
    private readonly UserDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(UserDbContext context, ITokenService tokenService, IEmailService emailService, ILogger<AuthService> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
        {
            _logger.LogWarning("Login attempt for non-existent email: {Email}", request.Email);
            throw new AuthenticationException("EMAIL_NOT_FOUND", "The email address you entered does not exist in our system. Please check your email or register for a new account.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Invalid password for email: {Email}", request.Email);
            throw new AuthenticationException("INVALID_PASSWORD", "The password you entered is incorrect. Please try again or reset your password.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt for inactive user: {Email}", request.Email);
            throw new AuthenticationException("ACCOUNT_INACTIVE", "Your account has been deactivated. Please contact support for assistance.");
        }

        if (!user.EmailVerified)
        {
            _logger.LogWarning("Login attempt for unverified email: {Email}", request.Email);
            throw new AuthenticationException("EMAIL_NOT_VERIFIED", "Please verify your email address before logging in. Check your inbox for a verification link.");
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

        // Send welcome email
        await _emailService.SendWelcomeEmailAsync(user);

        _logger.LogInformation("New user registered: {Email}", user.Email);

        return ToDto(user);
    }

    public async Task<bool> RequestPasswordResetAsync(RequestPasswordResetRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !user.IsActive)
        {
            // Don't reveal if email exists or not for security
            _logger.LogInformation("Password reset requested for non-existent or inactive email: {Email}", request.Email);
            return true; // Return true to avoid email enumeration attacks
        }

        // Invalidate any existing reset tokens for this user
        var existingTokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.IsActive)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsUsed = true;
        }

        // Create new password reset token (expires in 1 hour)
        var resetToken = new PasswordResetToken
        {
            Token = GenerateSecureToken(),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        _context.PasswordResetTokens.Add(resetToken);
        await _context.SaveChangesAsync();

        // Send password reset email
        await _emailService.SendPasswordResetEmailAsync(user, resetToken.Token);

        _logger.LogInformation("Password reset email sent to user: {Email}", user.Email);

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token);

        if (resetToken == null || !resetToken.IsActive)
        {
            _logger.LogWarning("Invalid or expired password reset token used");
            return false;
        }

        // Update password
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Password reset successful for user: {Email}", resetToken.User.Email);

        return true;
    }

    public Task<bool> VerifyEmailAsync(string token)
    {
        // For email verification, we could use a similar token system
        // For now, this is a placeholder implementation
        // In a real implementation, you'd have email verification tokens separate from password reset tokens

        _logger.LogInformation("Email verification attempted with token: {Token}", token);

        // TODO: Implement email verification logic
        // This would typically involve:
        // 1. Finding the email verification token
        // 2. Marking the user's email as verified
        // 3. Invalidating the token

        return Task.FromResult(false); // Placeholder
    }

    private static string GenerateSecureToken()
    {
        // Generate a cryptographically secure random token
        var bytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("/", "").Replace("+", "").Replace("=", "");
    }

    private static UserDto ToDto(User user) => new(
        user.Id,
        user.Email,
        user.FirstName,
        user.LastName,
        user.FullName,
        user.IsActive,
        user.EmailVerified,
        user.Role,
        user.PreferredLanguage,
        user.CreatedAt,
        user.LastLoginAt
    );
}
