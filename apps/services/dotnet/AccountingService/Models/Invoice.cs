using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents an invoice (incoming or outgoing)
/// </summary>
public class Invoice
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public InvoiceType Type { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    // Customer/Supplier reference (from MasterdataService)
    public Guid? CustomerId { get; set; }

    public Guid? SupplierId { get; set; }

    // Order reference (from ShopService)
    public Guid? OrderId { get; set; }

    [MaxLength(50)]
    public string? OrderNumber { get; set; }

    [MaxLength(200)]
    public string? CustomerName { get; set; }

    [MaxLength(200)]
    public string? SupplierName { get; set; }

    [MaxLength(500)]
    public string? BillingAddress { get; set; }

    [MaxLength(100)]
    public string? BillingCity { get; set; }

    [MaxLength(20)]
    public string? BillingPostalCode { get; set; }

    [MaxLength(100)]
    public string? BillingCountry { get; set; }

    [MaxLength(50)]
    public string? VatNumber { get; set; }

    public DateTime IssueDate { get; set; } = DateTime.UtcNow;

    public DateTime InvoiceDate => IssueDate; // Alias for compatibility

    public DateTime DueDate { get; set; }

    public DateTime? PaidDate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(5,4)")]
    public decimal TaxRate { get; set; } = 0.19m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    public decimal TotalAmount => Total; // Alias

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; } = 0;

    public decimal PaidAmount => AmountPaid; // Alias

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountDue => Total - AmountPaid;

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? InternalNotes { get; set; }

    [MaxLength(50)]
    public string? PaymentTerms { get; set; } = "Net 30";

    public ICollection<InvoiceLineItem> LineItems { get; set; } = new List<InvoiceLineItem>();

    public ICollection<PaymentRecord> Payments { get; set; } = new List<PaymentRecord>();

    // Linked journal entry
    public Guid? JournalEntryId { get; set; }

    public JournalEntry? JournalEntry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum InvoiceType
{
    SalesInvoice,      // Outgoing - we invoice customers
    PurchaseInvoice,   // Incoming - suppliers invoice us
    CreditNote,        // Credit memo
    DebitNote          // Debit memo
}

public enum InvoiceStatus
{
    Draft,
    Sent,
    Viewed,
    PartiallyPaid,
    Paid,
    Overdue,
    Cancelled,
    Disputed,
    Void
}
