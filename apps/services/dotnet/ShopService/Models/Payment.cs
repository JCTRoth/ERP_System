using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Payment
{
    [Key]
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public PaymentMethod Method { get; set; }

    public PaymentTransactionStatus Status { get; set; } = PaymentTransactionStatus.Pending;

    [MaxLength(200)]
    public string? TransactionId { get; set; }

    [MaxLength(200)]
    public string? GatewayReference { get; set; }

    [MaxLength(500)]
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }
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

public enum PaymentTransactionStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
    Refunded
}
