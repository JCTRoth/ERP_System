namespace UserService.Services;

internal static class PlatformRoleHelper
{
    internal static string NormalizePlatformRole(string? rawRole)
    {
        if (string.IsNullOrWhiteSpace(rawRole))
        {
            return "USER";
        }

        return rawRole.Trim().ToLowerInvariant() switch
        {
            "admin" or "super_admin" => "SUPER_ADMIN",
            "viewer" => "VIEWER",
            _ => "USER"
        };
    }
}
