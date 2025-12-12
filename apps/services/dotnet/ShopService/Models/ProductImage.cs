using System.ComponentModel.DataAnnotations;

namespace ShopService.Models;

public class ProductImage
{
    [Key]
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? AltText { get; set; }

    public int SortOrder { get; set; } = 0;

    public bool IsPrimary { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
