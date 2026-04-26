namespace OrdersService.Services;

using ServiceDefaults;

public interface ICompanyContext
{
    Guid? CurrentCompanyId { get; }
    Guid RequireCompanyId();
}

public class CompanyContext : ICompanyContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private Guid? _companyId;
    private bool _parsed;

    public CompanyContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? CurrentCompanyId
    {
        get
        {
            if (!_parsed)
            {
                _parsed = true;
                var user = _httpContextAccessor.HttpContext?.User;
                var companyId = user?.GetCurrentCompanyId();
                if (companyId.HasValue && companyId.Value != Guid.Empty)
                {
                    _companyId = companyId.Value;
                }
            }
            return _companyId;
        }
    }

    public Guid RequireCompanyId()
    {
        return CurrentCompanyId ?? throw new GraphQLException("Company context is required. Please select a company.");
    }
}
