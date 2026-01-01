using System.ComponentModel.DataAnnotations;

namespace ShopService.Models;

public class Customer
{
    [Key]
    public Guid Id { get; set; }

    // Reference to User in UserService (federated)
    public Guid? UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? Company { get; set; }

    [MaxLength(50)]
    public string? VatNumber { get; set; }

    // Default Shipping Address
    [MaxLength(500)]
    public string? DefaultShippingAddress { get; set; }

    [MaxLength(100)]
    public string? DefaultShippingCity { get; set; }

    [MaxLength(20)]
    public string? DefaultShippingPostalCode { get; set; }

    [MaxLength(100)]
    public string? DefaultShippingCountry { get; set; }

    // Default Billing Address
    [MaxLength(500)]
    public string? DefaultBillingAddress { get; set; }

    [MaxLength(100)]
    public string? DefaultBillingCity { get; set; }

    [MaxLength(20)]
    public string? DefaultBillingPostalCode { get; set; }

    [MaxLength(100)]
    public string? DefaultBillingCountry { get; set; }

    public CustomerType Type { get; set; } = CustomerType.Individual;

    public bool IsActive { get; set; } = true;

    public bool AcceptsMarketing { get; set; } = false;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Cart> Carts { get; set; } = new List<Cart>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public enum CustomerType
{
    Individual,
    Business,
    Wholesale
}
