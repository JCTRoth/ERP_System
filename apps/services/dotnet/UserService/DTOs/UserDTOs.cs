namespace UserService.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User,
    AuthorizationContextDto? Authorization = null
);

public record RefreshTokenRequest(string RefreshToken, Guid? CompanyId = null);

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

public record ScopeGrantDto(
    string PermissionCode,
    string ScopeType,
    string? ScopeJson
);

public record AuthorizationContextDto(
    Guid UserId,
    Guid CompanyId,
    string CompanyName,
    bool MembershipValid,
    string? CompanyRole,
    bool IsGlobalSuperAdmin,
    IReadOnlyList<string> GroupCodes,
    IReadOnlyList<string> PermissionCodes,
    IReadOnlyList<ScopeGrantDto> ScopeGrants
);

public record AuthContextPayload(
    string AccessToken,
    DateTime ExpiresAt,
    UserDto User,
    AuthorizationContextDto Authorization
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
