using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Product
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

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

    public int? LowStockThreshold { get; set; } = 10;

    public bool TrackInventory { get; set; } = true;

    public bool AllowBackorder { get; set; } = false;

    [Column(TypeName = "decimal(10,3)")]
    public decimal? Weight { get; set; }

    [MaxLength(20)]
    public string? WeightUnit { get; set; } = "kg";

    [Column(TypeName = "decimal(10,2)")]
    public decimal? Length { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? Width { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? Height { get; set; }

    [MaxLength(10)]
    public string? DimensionUnit { get; set; } = "cm";

    public Guid? CategoryId { get; set; }

    public Category? Category { get; set; }

    public Guid? BrandId { get; set; }

    public Brand? Brand { get; set; }

    public Guid? SupplierId { get; set; }

    public Supplier? Supplier { get; set; }

    public ProductStatus Status { get; set; } = ProductStatus.Draft;

    public bool IsFeatured { get; set; } = false;

    public bool IsDigital { get; set; } = false;

    [MaxLength(100)]
    public string? Slug { get; set; }

    [MaxLength(200)]
    public string? MetaTitle { get; set; }

    [MaxLength(500)]
    public string? MetaDescription { get; set; }

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();

    public ICollection<ProductAttribute> Attributes { get; set; } = new List<ProductAttribute>();

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? PublishedAt { get; set; }
}

public enum ProductStatus
{
    Draft,
    Active,
    Archived,
    OutOfStock
}
