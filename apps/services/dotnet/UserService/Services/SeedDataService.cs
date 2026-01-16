using UserService.Data;
using UserService.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

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
            // Admin user
            new User
            {
                Id = Guid.NewGuid(),
                Email = "admin@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                FirstName = "Marcus",
                LastName = "Johnson",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "admin"
            },
            // CEO
            new User
            {
                Id = Guid.NewGuid(),
                Email = "ceo@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ceo123!"),
                FirstName = "Dr. Sarah",
                LastName = "Williams",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // CFO
            new User
            {
                Id = Guid.NewGuid(),
                Email = "cfo@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Cfo123!"),
                FirstName = "Michael",
                LastName = "Chen",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Head of Research
            new User
            {
                Id = Guid.NewGuid(),
                Email = "research@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Research123!"),
                FirstName = "Dr. Elena",
                LastName = "Rodriguez",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Sales Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "sales@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Sales123!"),
                FirstName = "James",
                LastName = "Thompson",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Procurement Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "procurement@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Procurement123!"),
                FirstName = "Lisa",
                LastName = "Anderson",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Warehouse Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "warehouse@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Warehouse123!"),
                FirstName = "Robert",
                LastName = "Davis",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Customer Service Rep
            new User
            {
                Id = Guid.NewGuid(),
                Email = "support@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Support123!"),
                FirstName = "Maria",
                LastName = "Garcia",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            }
        };

        await _context.Users.AddRangeAsync(users);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Seeded {Count} MediVita users successfully", users.Length);
    }
}
