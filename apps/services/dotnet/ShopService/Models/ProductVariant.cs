using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class ProductVariant
{
    [Key]
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Sku { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Ean { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? CompareAtPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CostPrice { get; set; }

    public int StockQuantity { get; set; } = 0;

    [Column(TypeName = "decimal(10,3)")]
    public decimal? Weight { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    // Variant options stored as JSON
    [MaxLength(1000)]
    public string? Options { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
