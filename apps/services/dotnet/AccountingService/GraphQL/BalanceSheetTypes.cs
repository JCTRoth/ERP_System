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

public class AccountStatement
{
    public Guid AccountId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public List<AccountStatementTransaction> Transactions { get; set; } = new();
}

public class AccountStatementTransaction
{
    public DateTime Date { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
    public decimal RunningBalance { get; set; }
}
