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

            // Idempotent per-email seeding: demo users are added when missing,
            // so extending the demo set later also applies to existing databases.
            var seeded = await SeedDemoUsers();

            _logger.LogInformation("UserService database seeding completed successfully ({Seeded} new user(s))", seeded);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during UserService database seeding");
            throw;
        }
    }

    private async Task<int> SeedDemoUsers()
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
            },
            // Accounting Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "accounting@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Accounting123!"),
                FirstName = "Anna",
                LastName = "Schmidt",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Operations Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "operations@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Operations123!"),
                FirstName = "David",
                LastName = "Miller",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // HR Manager
            new User
            {
                Id = Guid.NewGuid(),
                Email = "hr@medivita.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Hr123!"),
                FirstName = "Laura",
                LastName = "Wilson",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "user"
            },
            // Demo_Corporation admin (second demo tenant)
            new User
            {
                Id = Guid.NewGuid(),
                Email = "admin@demo-corporation.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                FirstName = "Oliver",
                LastName = "Brown",
                IsActive = true,
                EmailVerified = true,
                PreferredLanguage = "en",
                CreatedAt = DateTime.UtcNow,
                Role = "admin"
            }
        };

        var existingEmails = await _context.Users
            .Where(u => users.Select(x => x.Email).Contains(u.Email))
            .Select(u => u.Email)
            .ToListAsync();

        var newUsers = users.Where(u => !existingEmails.Contains(u.Email, StringComparer.OrdinalIgnoreCase)).ToList();
        if (newUsers.Count == 0)
        {
            _logger.LogInformation("All demo users already present, nothing to seed.");
            return 0;
        }

        await _context.Users.AddRangeAsync(newUsers);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} new demo user(s) (total demo users: {Total})", newUsers.Count, users.Length);
        return newUsers.Count;
    }
}
