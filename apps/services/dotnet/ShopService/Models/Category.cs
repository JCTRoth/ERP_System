using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class Category
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

    public Guid? ParentCategoryId { get; set; }

    public Category? ParentCategory { get; set; }

    public ICollection<Category> SubCategories { get; set; } = new List<Category>();

    public ICollection<Product> Products { get; set; } = new List<Product>();

    public int SortOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
