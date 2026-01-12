using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents a payment record for tracking payments
/// </summary>
public class PaymentRecord
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string PaymentNumber { get; set; } = string.Empty;

    public PaymentRecordType Type { get; set; }

    public PaymentRecordStatus Status { get; set; } = PaymentRecordStatus.Pending;

    // Link to invoice
    public Guid? InvoiceId { get; set; }

    public Invoice? Invoice { get; set; }

    // Link to bank account
    public Guid? BankAccountId { get; set; }

    public BankAccount? BankAccount { get; set; }

    public PaymentMethod Method { get; set; }

    [NotMapped]
    [GraphQLIgnore]
    public string PaymentMethod => Method.ToString(); // Alias for serialization, not mapped to DB/GraphQL

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal RefundedAmount { get; set; } = 0;

    public bool IsRefund { get; set; } = false;

    public Guid? OriginalPaymentId { get; set; }

    public PaymentRecord? OriginalPayment { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    public DateTime? ClearedDate { get; set; }

    [MaxLength(200)]
    public string? Reference { get; set; }

    [MaxLength(200)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(200)]
    public string? TransactionId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Payer/Payee details
    [MaxLength(200)]
    public string? PayerName { get; set; }

    [MaxLength(200)]
    public string? PayeeName { get; set; }

    [MaxLength(50)]
    public string? PayerIban { get; set; }

    [MaxLength(50)]
    public string? PayeeIban { get; set; }

    // Linked journal entry
    public Guid? JournalEntryId { get; set; }

    public JournalEntry? JournalEntry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum PaymentRecordType
{
    CustomerPayment,   // Payment received from customer
    SupplierPayment,   // Payment made to supplier
    Refund,
    Transfer,
    BankFee,
    Other
}

public enum PaymentRecordStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
    Reversed,
    Refunded
}

public enum PaymentStatus
{
    Pending = PaymentRecordStatus.Pending,
    Processing = PaymentRecordStatus.Processing,
    Completed = PaymentRecordStatus.Completed,
    Failed = PaymentRecordStatus.Failed,
    Cancelled = PaymentRecordStatus.Cancelled,
    Refunded = PaymentRecordStatus.Refunded,
    Confirmed,
    Voided
}

public enum PaymentMethod
{
    BankTransfer,
    CreditCard,
    DebitCard,
    Cash,
    Check,
    PayPal,
    DirectDebit,
    Invoice,
    Other
}
