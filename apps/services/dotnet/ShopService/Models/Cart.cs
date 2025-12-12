using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Cart
{
    [Key]
    public Guid Id { get; set; }

    public Guid? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    // For guest carts (anonymous users)
    [MaxLength(100)]
    public string? SessionId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    [MaxLength(50)]
    public string? CouponCode { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }
}
