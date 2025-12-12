using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents a bank account for cash management
/// </summary>
public class BankAccount
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    [MaxLength(34)]
    public string? Iban { get; set; }

    [MaxLength(11)]
    public string? Bic { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentBalance { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal AvailableBalance { get; set; } = 0;

    public DateTime? LastSyncedAt { get; set; }

    public BankAccountType Type { get; set; } = BankAccountType.Checking;

    public bool IsActive { get; set; } = true;

    public bool IsPrimary { get; set; } = false;

    // Link to chart of accounts
    public Guid? AccountId { get; set; }

    public Account? Account { get; set; }

    public ICollection<BankTransaction> Transactions { get; set; } = new List<BankTransaction>();

    public ICollection<PaymentRecord> Payments { get; set; } = new List<PaymentRecord>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public class BankTransaction
{
    [Key]
    public Guid Id { get; set; }

    public Guid BankAccountId { get; set; }

    public BankAccount BankAccount { get; set; } = null!;

    public DateTime TransactionDate { get; set; }

    public DateTime? ValueDate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public BankTransactionType Type { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? Reference { get; set; }

    [MaxLength(200)]
    public string? CounterpartyName { get; set; }

    [MaxLength(50)]
    public string? CounterpartyIban { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal BalanceAfter { get; set; }

    public bool IsReconciled { get; set; } = false;

    public Guid? MatchedPaymentId { get; set; }

    public PaymentRecord? MatchedPayment { get; set; }

    public Guid? JournalEntryId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum BankAccountType
{
    Checking,
    Savings,
    CreditCard,
    Cash,
    PayPal,
    Other
}

public enum BankTransactionType
{
    Credit,
    Debit,
    Transfer,
    Fee,
    Interest,
    Other
}
