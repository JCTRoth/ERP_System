using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class InventoryMovement
{
    [Key]
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    public Guid? VariantId { get; set; }

    public ProductVariant? Variant { get; set; }

    public MovementType Type { get; set; }

    public int Quantity { get; set; }

    public int QuantityBefore { get; set; }

    public int QuantityAfter { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }

    [MaxLength(100)]
    public string? Reference { get; set; }

    public Guid? OrderId { get; set; }

    public Guid? UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum MovementType
{
    Adjustment,
    Sale,
    Return,
    Restock,
    Transfer,
    Damage,
    Theft,
    Correction
}
