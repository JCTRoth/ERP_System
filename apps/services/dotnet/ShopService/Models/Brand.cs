using System.ComponentModel.DataAnnotations;

namespace ShopService.Models;

public class Brand
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Slug { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    public string? WebsiteUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Product> Products { get; set; } = new List<Product>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
