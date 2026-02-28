namespace OrdersService.Services;

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
                var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Company-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(header) && Guid.TryParse(header, out var companyId) && companyId != Guid.Empty)
                {
                    _companyId = companyId;
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
