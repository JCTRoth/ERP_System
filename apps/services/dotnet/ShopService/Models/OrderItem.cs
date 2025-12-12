using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class OrderItem
{
    [Key]
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    public Guid? VariantId { get; set; }

    public ProductVariant? Variant { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Sku { get; set; } = string.Empty;

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
