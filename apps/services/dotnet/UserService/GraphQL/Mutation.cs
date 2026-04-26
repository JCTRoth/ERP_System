using HotChocolate;
using HotChocolate.Authorization;
using UserService.DTOs;
using UserService.Exceptions;
using UserService.Services;

namespace UserService.GraphQL;

public class Mutation
{
    private static Guid RequireAuthenticatedUserId(Guid? userId)
    {
        if (!userId.HasValue)
        {
            throw new AuthorizationException("UNAUTHENTICATED", "User is not authenticated");
        }
        return userId.Value;
    }

    public async Task<LoginResponse?> Login(
        [Service] IAuthService authService,
        string email,
        string password)
    {
        return await authService.LoginAsync(new LoginRequest(email, password));
    }

    public async Task<LoginResponse?> RefreshToken(
        [Service] IAuthService authService,
        string refreshToken,
        Guid? companyId = null)
    {
        return await authService.RefreshTokenAsync(refreshToken, companyId);
    }

    [Authorize]
    public async Task<bool> Logout(
        [Service] IAuthService authService,
        [GlobalState("CurrentUserId")] Guid? userId,
        string refreshToken)
    {
        return await authService.LogoutAsync(RequireAuthenticatedUserId(userId), refreshToken);
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

    [Authorize]
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

    [Authorize]
    public async Task<bool> ChangePassword(
        [Service] IUserService userService,
        [GlobalState("CurrentUserId")] Guid? id,
        string currentPassword,
        string newPassword)
    {
        return await userService.ChangePasswordAsync(
            RequireAuthenticatedUserId(id),
            new ChangePasswordRequest(currentPassword, newPassword));
    }

    [Authorize]
    public async Task<bool> DeactivateUser(
        [Service] IUserService userService,
        Guid id)
    {
        return await userService.DeactivateAsync(id);
    }

    [Authorize]
    public async Task<bool> ActivateUser(
        [Service] IUserService userService,
        Guid id)
    {
        return await userService.ActivateAsync(id);
    }

    public async Task<bool> RequestPasswordReset(
        [Service] IAuthService authService,
        string email)
    {
        return await authService.RequestPasswordResetAsync(new RequestPasswordResetRequest(email));
    }

    public async Task<bool> ResetPassword(
        [Service] IAuthService authService,
        string token,
        string newPassword)
    {
        return await authService.ResetPasswordAsync(new ResetPasswordRequest(token, newPassword));
    }

    public async Task<bool> VerifyEmail(
        [Service] IAuthService authService,
        string token)
    {
        return await authService.VerifyEmailAsync(token);
    }

    [Authorize]
    public async Task<AuthContextPayload> SwitchCompany(
        [Service] IAuthService authService,
        [GlobalState("CurrentUserId")] Guid? userId,
        Guid companyId)
    {
        return await authService.SwitchCompanyAsync(RequireAuthenticatedUserId(userId), companyId);
    }
}
