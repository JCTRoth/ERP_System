using HotChocolate;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;
using ServiceDefaults;
using UserService.Data;
using UserService.Models;
using UserService.Services;
using UserService.DTOs;

namespace UserService.GraphQL;

public class Query
{
    public string Test() => "Hello World";

    [Authorize]
    public async Task<List<UserDto>> GetUsers([Service] IUserService userService)
    {
        return await userService.GetAllAsync();
    }

    [Authorize]
    public async Task<User?> GetUser([Service] UserDbContext context, Guid id)
        => await context.Users.FindAsync(id);

    [Authorize]
    public async Task<User?> GetUserByEmail([Service] UserDbContext context, string email)
        => await context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

    [Authorize]
    public async Task<UserDto?> GetCurrentUser(
        [Service] IUserService userService,
        [GlobalState("CurrentUserId")] Guid? userId)
    {
        if (!userId.HasValue) return null;
        return await userService.GetByIdAsync(userId.Value);
    }

    // Alias for GetCurrentUser to match API expectations
    [Authorize]
    public async Task<UserDto?> Me(
        [Service] IUserService userService,
        [GlobalState("CurrentUserId")] Guid? userId)
    {
        return await GetCurrentUser(userService, userId);
    }

    [Authorize]
    public async Task<AuthorizationContextDto?> MeAuthorization(
        [Service] IAuthService authService,
        [Service] IRequestAuthorizationService requestAuthorizationService,
        [GlobalState("CurrentUserId")] Guid? userId)
    {
        if (!userId.HasValue || !requestAuthorizationService.CurrentCompanyId.HasValue)
        {
            return null;
        }

        return await authService.GetAuthorizationContextAsync(
            userId.Value,
            requestAuthorizationService.CurrentCompanyId.Value,
            requestAuthorizationService.IsGlobalSuperAdmin);
    }

    [Authorize]
    public async Task<int> GetTotalUsers([Service] UserDbContext context)
    {
        return await context.Users.CountAsync();
    }
}
