using HotChocolate;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;
using UserService.Services;
using UserService.DTOs;

namespace UserService.GraphQL;

public class Query
{
    public string Test() => "Hello World";

    public List<User> GetUsers()
    {
        return new List<User>
        {
            new User { Id = Guid.NewGuid(), Email = "test@example.com", FirstName = "Test", LastName = "User" }
        };
    }

    public async Task<User?> GetUser([Service] UserDbContext context, Guid id)
        => await context.Users.FindAsync(id);

    public async Task<User?> GetUserByEmail([Service] UserDbContext context, string email)
        => await context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

    public async Task<UserDto?> GetCurrentUser(
        [Service] IUserService userService,
        [GlobalState("CurrentUserId")] Guid? userId)
    {
        if (!userId.HasValue) return null;
        return await userService.GetByIdAsync(userId.Value);
    }
}
