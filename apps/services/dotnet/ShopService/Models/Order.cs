using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Order
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }

    public Customer Customer { get; set; } = null!;

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ShippingAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    [MaxLength(500)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? InternalNotes { get; set; }

    // Shipping Address
    [MaxLength(200)]
    public string? ShippingName { get; set; }

    [MaxLength(500)]
    public string? ShippingAddress { get; set; }

    [MaxLength(100)]
    public string? ShippingCity { get; set; }

    [MaxLength(20)]
    public string? ShippingPostalCode { get; set; }

    [MaxLength(100)]
    public string? ShippingCountry { get; set; }

    [MaxLength(50)]
    public string? ShippingPhone { get; set; }

    // Billing Address
    [MaxLength(200)]
    public string? BillingName { get; set; }

    [MaxLength(500)]
    public string? BillingAddress { get; set; }

    [MaxLength(100)]
    public string? BillingCity { get; set; }

    [MaxLength(20)]
    public string? BillingPostalCode { get; set; }

    [MaxLength(100)]
    public string? BillingCountry { get; set; }

    public Guid? ShippingMethodId { get; set; }

    public ShippingMethod? ShippingMethod { get; set; }

    [MaxLength(100)]
    public string? TrackingNumber { get; set; }

    public DateTime? ShippedAt { get; set; }

    public DateTime? DeliveredAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
    Refunded,
    OnHold
}

public enum PaymentStatus
{
    Pending,
    Authorized,
    Paid,
    PartiallyPaid,
    Refunded,
    PartiallyRefunded,
    Failed,
    Voided
}
