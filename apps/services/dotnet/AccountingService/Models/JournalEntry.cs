using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents a journal entry for double-entry bookkeeping
/// </summary>
public class JournalEntry
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string EntryNumber { get; set; } = string.Empty;

    public DateTime EntryDate { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Reference { get; set; }

    public JournalEntryType Type { get; set; }

    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;

    public ICollection<JournalEntryLine> Lines { get; set; } = new List<JournalEntryLine>();

    // Total debits and credits must be equal
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalDebit { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalCredit { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    // Link to source document
    public Guid? InvoiceId { get; set; }

    public Invoice? Invoice { get; set; }

    public Guid? PaymentId { get; set; }

    public PaymentRecord? Payment { get; set; }

    // Audit fields
    public Guid? CreatedByUserId { get; set; }

    public Guid? ApprovedByUserId { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public bool IsReversing { get; set; } = false;

    public Guid? ReversedEntryId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public class JournalEntryLine
{
    [Key]
    public Guid Id { get; set; }

    public Guid JournalEntryId { get; set; }

    public JournalEntry JournalEntry { get; set; } = null!;

    public int LineNumber { get; set; }

    public Guid AccountId { get; set; }

    public Account Account { get; set; } = null!;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DebitAmount { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal CreditAmount { get; set; } = 0;

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum JournalEntryType
{
    Standard,
    Adjusting,
    Closing,
    Reversing,
    Opening,
    Manual
}

public enum JournalEntryStatus
{
    Draft,
    Pending,
    Posted,
    Reversed,
    Voided
}
