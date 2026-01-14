using UserService.Data;
using UserService.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace UserService.Services;

public interface ISeedDataService
{
    Task SeedAsync();
}

public class SeedDataService : ISeedDataService
{
    private readonly UserDbContext _context;
    private readonly ILogger<SeedDataService> _logger;
    private readonly IEmailService _emailService;

    public SeedDataService(UserDbContext context, ILogger<SeedDataService> logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting UserService database seeding...");

            if (!await _context.Users.AnyAsync())
            {
                _logger.LogInformation("Seeding demo users...");
                await SeedDemoUsers();
            }

            _logger.LogInformation("UserService database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during UserService database seeding");
            throw;
        }
    }

    private async Task SeedDemoUsers()
    {
        var users = new[]
        {
            new User
            {
                Id = Guid.NewGuid(),
                Email = "admin@erp-system.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                FirstName = "Admin",
                LastName = "User",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "john.doe@erp-system.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                FirstName = "John",
                LastName = "Doe",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "jane.smith@erp-system.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                FirstName = "Jane",
                LastName = "Smith",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "max.mueller@erp-system.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                FirstName = "Max",
                LastName = "Müller",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "de",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "marie.dupont@erp-system.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                FirstName = "Marie",
                LastName = "Dupont",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "fr",
                CreatedAt = DateTime.UtcNow
            }
        };

        await _context.Users.AddRangeAsync(users);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Seeded {Count} demo users successfully", users.Length);
    }
}
