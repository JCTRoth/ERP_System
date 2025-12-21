using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;

namespace UserService.Services;

public interface IUserService
{
    Task<UserDto?> GetByIdAsync(Guid id);
    Task<UserDto?> GetByEmailAsync(string email);
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request);
    Task<bool> ChangePasswordAsync(Guid id, ChangePasswordRequest request);
    Task<bool> DeactivateAsync(Guid id);
    Task<bool> ActivateAsync(Guid id);
}

public class UserServiceImpl : IUserService
{
    private readonly UserDbContext _context;
    private readonly ILogger<UserServiceImpl> _logger;

    public UserServiceImpl(UserDbContext context, ILogger<UserServiceImpl> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        return user == null ? null : ToDto(user);
    }

    public async Task<UserDto?> GetByEmailAsync(string email)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        return user == null ? null : ToDto(user);
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        return await _context.Users
            .Select(u => ToDto(u))
            .ToListAsync();
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        if (!string.IsNullOrEmpty(request.FirstName))
            user.FirstName = request.FirstName;
        
        if (!string.IsNullOrEmpty(request.LastName))
            user.LastName = request.LastName;
        
        if (!string.IsNullOrEmpty(request.PreferredLanguage))
            user.PreferredLanguage = request.PreferredLanguage;

        await _context.SaveChangesAsync();
        _logger.LogInformation("User updated: {UserId}", id);

        return ToDto(user);
    }

    public async Task<bool> ChangePasswordAsync(Guid id, ChangePasswordRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Invalid current password for user: {UserId}", id);
            return false;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        
        // Revoke all refresh tokens
        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == id && !t.IsRevoked)
            .ToListAsync();
        
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedReason = "Password changed";
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Password changed for user: {UserId}", id);

        return true;
    }

    public async Task<bool> DeactivateAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.IsActive = false;
        
        // Revoke all refresh tokens
        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == id && !t.IsRevoked)
            .ToListAsync();
        
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedReason = "User deactivated";
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("User deactivated: {UserId}", id);

        return true;
    }

    public async Task<bool> ActivateAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.IsActive = true;
        await _context.SaveChangesAsync();
        _logger.LogInformation("User activated: {UserId}", id);

        return true;
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
