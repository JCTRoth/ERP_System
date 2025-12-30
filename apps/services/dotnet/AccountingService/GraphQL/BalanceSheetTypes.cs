namespace AccountingService.GraphQL;

public class BalanceSheetLine
{
    public Guid AccountId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsSystemAccount { get; set; }
    public decimal Balance { get; set; }
}

public class AssetsSection
{
    public List<BalanceSheetLine> Current { get; set; } = new();
    public List<BalanceSheetLine> NonCurrent { get; set; } = new();
    public decimal TotalCurrent { get; set; }
    public decimal TotalNonCurrent { get; set; }
    public decimal Total { get; set; }
}

public class LiabilitiesSection
{
    public List<BalanceSheetLine> Current { get; set; } = new();
    public List<BalanceSheetLine> NonCurrent { get; set; } = new();
    public decimal TotalCurrent { get; set; }
    public decimal TotalNonCurrent { get; set; }
    public decimal Total { get; set; }
}

public class EquitySection
{
    public List<BalanceSheetLine> Items { get; set; } = new();
    public decimal RetainedEarnings { get; set; }
    public decimal Total { get; set; }
}

public class BalanceSheet
{
    public DateTime AsOfDate { get; set; }
    public AssetsSection Assets { get; set; } = new();
    public LiabilitiesSection Liabilities { get; set; } = new();
    public EquitySection Equity { get; set; } = new();
    public decimal TotalLiabilitiesAndEquity { get; set; }
}
