using System.ComponentModel.DataAnnotations;

namespace ShopService.Models;

public class Supplier
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Code { get; set; }

    [MaxLength(200)]
    public string? ContactPerson { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(20)]
    public string? PostalCode { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(50)]
    public string? VatNumber { get; set; }

    public int LeadTimeDays { get; set; } = 7;

    [MaxLength(3)]
    public string Currency { get; set; } = "EUR";

    public bool IsActive { get; set; } = true;

    public ICollection<Product> Products { get; set; } = new List<Product>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
