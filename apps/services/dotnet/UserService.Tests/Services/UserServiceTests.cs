using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;
using UserService.Services;
using Xunit;

namespace UserService.Tests.Services;

public class UserServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly UserService.Services.UserService _userService;

    public UserServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _userService = new UserService.Services.UserService(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsAllUsers()
    {
        // Arrange
        await SeedUsers();

        // Act
        var result = await _userService.GetUsersAsync();

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetUserByIdAsync_ReturnsUser_WhenUserExists()
    {
        // Arrange
        var user = await CreateUser("test@example.com");

        // Act
        var result = await _userService.GetUserByIdAsync(user.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetUserByIdAsync_ReturnsNull_WhenUserNotExists()
    {
        // Act
        var result = await _userService.GetUserByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetUserByEmailAsync_ReturnsUser_WhenEmailExists()
    {
        // Arrange
        await CreateUser("findme@example.com");

        // Act
        var result = await _userService.GetUserByEmailAsync("findme@example.com");

        // Assert
        result.Should().NotBeNull();
        result!.Email.Should().Be("findme@example.com");
    }

    [Fact]
    public async Task CreateUserAsync_CreatesUser_WithValidInput()
    {
        // Arrange
        var input = new CreateUserInput
        {
            Email = "new@example.com",
            Password = "Password123!",
            FirstName = "New",
            LastName = "User",
            PreferredLanguage = "en"
        };

        // Act
        var result = await _userService.CreateUserAsync(input);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be("new@example.com");
        result.FirstName.Should().Be("New");
        result.LastName.Should().Be("User");
        
        // Verify in database
        var dbUser = await _context.Users.FindAsync(result.Id);
        dbUser.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateUserAsync_HashesPassword()
    {
        // Arrange
        var input = new CreateUserInput
        {
            Email = "hash@example.com",
            Password = "PlainPassword123!",
            FirstName = "Hash",
            LastName = "Test"
        };

        // Act
        var result = await _userService.CreateUserAsync(input);

        // Assert
        var dbUser = await _context.Users.FindAsync(result.Id);
        dbUser!.PasswordHash.Should().NotBe("PlainPassword123!");
        dbUser.PasswordHash.Should().NotBeEmpty();
    }

    [Fact]
    public async Task UpdateUserAsync_UpdatesUser_WhenUserExists()
    {
        // Arrange
        var user = await CreateUser("update@example.com");
        var input = new UpdateUserInput
        {
            FirstName = "Updated",
            LastName = "Name"
        };

        // Act
        var result = await _userService.UpdateUserAsync(user.Id, input);

        // Assert
        result.Should().NotBeNull();
        result!.FirstName.Should().Be("Updated");
        result.LastName.Should().Be("Name");
    }

    [Fact]
    public async Task DeleteUserAsync_ReturnsTrue_WhenUserExists()
    {
        // Arrange
        var user = await CreateUser("delete@example.com");

        // Act
        var result = await _userService.DeleteUserAsync(user.Id);

        // Assert
        result.Should().BeTrue();
        
        var dbUser = await _context.Users.FindAsync(user.Id);
        dbUser.Should().BeNull();
    }

    [Fact]
    public async Task DeleteUserAsync_ReturnsFalse_WhenUserNotExists()
    {
        // Act
        var result = await _userService.DeleteUserAsync(Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    private async Task<User> CreateUser(string email)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = "hashedpassword",
            FirstName = "Test",
            LastName = "User",
            PreferredLanguage = "en",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    private async Task SeedUsers()
    {
        await CreateUser("user1@example.com");
        await CreateUser("user2@example.com");
    }
}
