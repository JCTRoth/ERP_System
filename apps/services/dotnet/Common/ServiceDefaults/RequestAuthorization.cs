using System.Security.Claims;
using System.Text.Json;

namespace ServiceDefaults;

public interface IRequestAuthorizationService
{
    ClaimsPrincipal User { get; }
    bool IsAuthenticated { get; }
    Guid? CurrentUserId { get; }
    Guid? CurrentCompanyId { get; }
    bool IsGlobalSuperAdmin { get; }
    IReadOnlyCollection<string> PermissionCodes { get; }
    IReadOnlyCollection<string> GroupCodes { get; }
    bool HasPermission(string permissionCode);
    bool HasAnyPermission(params string[] permissionCodes);
    bool HasCompanyAccess(Guid companyId);
}

public sealed class RequestAuthorizationService : IRequestAuthorizationService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RequestAuthorizationService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public ClaimsPrincipal User => _httpContextAccessor.HttpContext?.User ?? new ClaimsPrincipal(new ClaimsIdentity());

    public bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    public Guid? CurrentUserId => User.GetCurrentUserId();

    public Guid? CurrentCompanyId => User.GetCurrentCompanyId();

    public bool IsGlobalSuperAdmin => User.IsGlobalSuperAdmin();

    public IReadOnlyCollection<string> PermissionCodes => User.GetPermissionCodes();

    public IReadOnlyCollection<string> GroupCodes => User.GetGroupCodes();

    public bool HasPermission(string permissionCode) => User.HasPermission(permissionCode);

    public bool HasAnyPermission(params string[] permissionCodes) => User.HasAnyPermission(permissionCodes);

    public bool HasCompanyAccess(Guid companyId) => User.HasCompanyAccess(companyId);
}

public static class ClaimsPrincipalAuthorizationExtensions
{
    public const string CompanyIdClaim = "company_id";
    public const string PlatformRoleClaim = "platform_role";
    public const string IsGlobalSuperAdminClaim = "is_global_super_admin";
    public const string PermissionCodeClaim = "permission_code";
    public const string GroupCodeClaim = "group_code";
    public const string CompanyRoleClaim = "company_role";

    public static Guid? GetCurrentUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public static Guid? GetCurrentCompanyId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(CompanyIdClaim);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public static string? GetPlatformRole(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(PlatformRoleClaim)
            ?? user.FindFirstValue(ClaimTypes.Role)
            ?? user.FindFirstValue("role");
    }

    public static string? GetCompanyRole(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(CompanyRoleClaim);
    }

    public static bool IsGlobalSuperAdmin(this ClaimsPrincipal user)
    {
        var explicitClaim = user.FindFirstValue(IsGlobalSuperAdminClaim);
        if (bool.TryParse(explicitClaim, out var parsed))
        {
            return parsed;
        }

        var normalizedRole = user.GetPlatformRole()?.Trim().ToUpperInvariant();
        return normalizedRole is "SUPER_ADMIN" or "ADMIN";
    }

    public static IReadOnlyCollection<string> GetPermissionCodes(this ClaimsPrincipal user)
    {
        return GetMultiValueClaim(user, PermissionCodeClaim);
    }

    public static IReadOnlyCollection<string> GetGroupCodes(this ClaimsPrincipal user)
    {
        return GetMultiValueClaim(user, GroupCodeClaim);
    }

    public static bool HasPermission(this ClaimsPrincipal user, string permissionCode)
    {
        if (user.IsGlobalSuperAdmin())
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(permissionCode))
        {
            return false;
        }

        return user.GetPermissionCodes().Contains(permissionCode, StringComparer.OrdinalIgnoreCase);
    }

    public static bool HasAnyPermission(this ClaimsPrincipal user, IEnumerable<string> permissionCodes)
    {
        if (user.IsGlobalSuperAdmin())
        {
            return true;
        }

        var permissions = user.GetPermissionCodes();
        return permissionCodes.Any(code => permissions.Contains(code, StringComparer.OrdinalIgnoreCase));
    }

    public static bool HasAnyPermission(this ClaimsPrincipal user, params string[] permissionCodes)
        => user.HasAnyPermission((IEnumerable<string>)permissionCodes);

    public static bool HasCompanyAccess(this ClaimsPrincipal user, Guid companyId)
    {
        if (user.IsGlobalSuperAdmin())
        {
            return true;
        }

        var currentCompanyId = user.GetCurrentCompanyId();
        return currentCompanyId.HasValue && currentCompanyId.Value == companyId;
    }

    private static IReadOnlyCollection<string> GetMultiValueClaim(ClaimsPrincipal user, string claimType)
    {
        var values = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var claim in user.FindAll(claimType))
        {
            foreach (var value in ExpandClaimValue(claim.Value))
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    values.Add(value);
                }
            }
        }

        return values.ToArray();
    }

    private static IEnumerable<string> ExpandClaimValue(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            yield break;
        }

        var trimmed = rawValue.Trim();

        if (trimmed.StartsWith("[", StringComparison.Ordinal))
        {
            string[]? parsed = null;
            try
            {
                parsed = JsonSerializer.Deserialize<string[]>(trimmed);
            }
            catch (JsonException)
            {
            }

            if (parsed != null)
            {
                foreach (var value in parsed)
                {
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        yield return value;
                    }
                }
                yield break;
            }
        }

        if (trimmed.Contains(',', StringComparison.Ordinal))
        {
            foreach (var item in trimmed.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!string.IsNullOrWhiteSpace(item))
                {
                    yield return item;
                }
            }
            yield break;
        }

        yield return trimmed;
    }
}
