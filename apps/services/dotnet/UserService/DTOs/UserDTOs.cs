namespace UserService.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record RefreshTokenRequest(string RefreshToken);

public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PreferredLanguage = "en"
);

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    bool IsActive,
    bool EmailVerified,
    string Role,
    string? PreferredLanguage,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

public record UpdateUserRequest(
    string? FirstName,
    string? LastName,
    string? PreferredLanguage
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record RequestPasswordResetRequest(string Email);

public record ResetPasswordRequest(
    string Token,
    string NewPassword
);

public record VerifyEmailRequest(string Token);
