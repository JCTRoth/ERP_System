using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Coupon
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Description { get; set; }

    public CouponType Type { get; set; } = CouponType.Percentage;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Value { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? MinimumOrderAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? MaximumDiscountAmount { get; set; }

    public int? UsageLimit { get; set; }

    public int? UsageLimitPerCustomer { get; set; }

    public int UsageCount { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime? StartsAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    // Applicable to specific categories or products (JSON array of IDs)
    [MaxLength(2000)]
    public string? ApplicableCategories { get; set; }

    [MaxLength(2000)]
    public string? ApplicableProducts { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum CouponType
{
    Percentage,
    FixedAmount,
    FreeShipping,
    BuyXGetY
}
