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

    public async Task<List<UserDto>> GetUsers([Service] IUserService userService)
    {
        return await userService.GetAllAsync();
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

    // Alias for GetCurrentUser to match API expectations
    public async Task<UserDto?> Me(
        [Service] IUserService userService,
        [GlobalState("CurrentUserId")] Guid? userId)
    {
        return await GetCurrentUser(userService, userId);
    }
}
