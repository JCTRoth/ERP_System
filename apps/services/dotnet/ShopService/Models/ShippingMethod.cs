using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class ShippingMethod
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? Code { get; set; }

    [MaxLength(100)]
    public string? Carrier { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? FreeShippingThreshold { get; set; }

    public int? EstimatedDeliveryDays { get; set; }

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; } = 0;

    // Countries where this method is available (JSON array or comma-separated)
    [MaxLength(1000)]
    public string? AvailableCountries { get; set; }

    [Column(TypeName = "decimal(10,3)")]
    public decimal? MaxWeight { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
