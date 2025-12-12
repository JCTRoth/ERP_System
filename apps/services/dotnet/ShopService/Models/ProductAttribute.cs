using System.ComponentModel.DataAnnotations;

namespace ShopService.Models;

public class ProductAttribute
{
    [Key]
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Value { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;

    public bool IsVisible { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
