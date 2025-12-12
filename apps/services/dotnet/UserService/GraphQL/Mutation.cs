using HotChocolate;
using UserService.DTOs;
using UserService.Services;

namespace UserService.GraphQL;

public class Mutation
{
    public async Task<LoginResponse?> Login(
        [Service] IAuthService authService,
        string email,
        string password)
    {
        return await authService.LoginAsync(new LoginRequest(email, password));
    }

    public async Task<LoginResponse?> RefreshToken(
        [Service] IAuthService authService,
        string refreshToken)
    {
        return await authService.RefreshTokenAsync(refreshToken);
    }

    public async Task<bool> Logout(
        [Service] IAuthService authService,
        Guid userId,
        string refreshToken)
    {
        return await authService.LogoutAsync(userId, refreshToken);
    }

    public async Task<UserDto?> Register(
        [Service] IAuthService authService,
        string email,
        string password,
        string firstName,
        string lastName,
        string? preferredLanguage = null)
    {
        return await authService.RegisterAsync(new RegisterRequest(
            email, password, firstName, lastName, preferredLanguage));
    }

    public async Task<UserDto?> UpdateUser(
        [Service] IUserService userService,
        Guid id,
        string? firstName,
        string? lastName,
        string? preferredLanguage)
    {
        return await userService.UpdateAsync(id, new UpdateUserRequest(
            firstName, lastName, preferredLanguage));
    }

    public async Task<bool> ChangePassword(
        [Service] IUserService userService,
        Guid id,
        string currentPassword,
        string newPassword)
    {
        return await userService.ChangePasswordAsync(id, 
            new ChangePasswordRequest(currentPassword, newPassword));
    }

    public async Task<bool> DeactivateUser(
        [Service] IUserService userService,
        Guid id)
    {
        return await userService.DeactivateAsync(id);
    }

    public async Task<bool> ActivateUser(
        [Service] IUserService userService,
        Guid id)
    {
        return await userService.ActivateAsync(id);
    }
}
