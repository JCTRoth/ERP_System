using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents a chart of accounts entry
/// </summary>
public class Account
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string AccountNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public AccountType Type { get; set; }

    public AccountCategory Category { get; set; }

    public Guid? ParentAccountId { get; set; }

    public Account? ParentAccount { get; set; }

    public ICollection<Account> ChildAccounts { get; set; } = new List<Account>();

    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; } = 0;

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public bool IsActive { get; set; } = true;

    public bool IsSystemAccount { get; set; } = false;

    public int SortOrder { get; set; } = 0;

    public ICollection<JournalEntryLine> JournalEntryLines { get; set; } = new List<JournalEntryLine>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum AccountType
{
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense
}

public enum AccountCategory
{
    // Assets
    Cash,
    BankAccount,
    AccountsReceivable,
    Inventory,
    FixedAssets,
    OtherAssets,

    // Liabilities
    AccountsPayable,
    ShortTermDebt,
    LongTermDebt,
    TaxLiabilities,
    OtherLiabilities,

    // Equity
    Capital,
    RetainedEarnings,
    OtherEquity,

    // Revenue
    Sales,
    ServiceRevenue,
    OtherIncome,

    // Expenses
    CostOfGoodsSold,
    OperatingExpenses,
    Payroll,
    Taxes,
    Depreciation,
    OtherExpenses
}
