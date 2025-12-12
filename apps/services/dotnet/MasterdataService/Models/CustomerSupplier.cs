using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MasterdataService.Models;

public class Customer
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string CustomerNumber { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    public CustomerType Type { get; set; } = CustomerType.Individual;
    
    [MaxLength(100)]
    public string? ContactPerson { get; set; }
    
    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Fax { get; set; }
    
    [MaxLength(100)]
    public string? Website { get; set; }
    
    [MaxLength(50)]
    public string? TaxId { get; set; }
    
    public Guid? DefaultCurrencyId { get; set; }
    public Currency? DefaultCurrency { get; set; }
    
    public Guid? DefaultPaymentTermId { get; set; }
    public PaymentTerm? DefaultPaymentTerm { get; set; }
    
    public decimal CreditLimit { get; set; }
    public decimal CurrentBalance { get; set; }
    
    public CustomerStatus Status { get; set; } = CustomerStatus.Active;
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    // Relationships
    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    public ICollection<BankDetail> BankDetails { get; set; } = new List<BankDetail>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum CustomerType
{
    Individual,
    Business,
    Government,
    NonProfit
}

public enum CustomerStatus
{
    Active,
    Inactive,
    Suspended,
    Blocked
}

public class Supplier
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string SupplierNumber { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    public SupplierType Type { get; set; } = SupplierType.Vendor;
    
    [MaxLength(100)]
    public string? ContactPerson { get; set; }
    
    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Fax { get; set; }
    
    [MaxLength(100)]
    public string? Website { get; set; }
    
    [MaxLength(50)]
    public string? TaxId { get; set; }
    
    public Guid? DefaultCurrencyId { get; set; }
    public Currency? DefaultCurrency { get; set; }
    
    public Guid? DefaultPaymentTermId { get; set; }
    public PaymentTerm? DefaultPaymentTerm { get; set; }
    
    public int LeadTimeDays { get; set; }
    public decimal MinimumOrderValue { get; set; }
    
    public SupplierStatus Status { get; set; } = SupplierStatus.Active;
    public SupplierRating Rating { get; set; } = SupplierRating.Standard;
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    // Relationships
    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    public ICollection<BankDetail> BankDetails { get; set; } = new List<BankDetail>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum SupplierType
{
    Vendor,
    Manufacturer,
    Distributor,
    ServiceProvider,
    Contractor
}

public enum SupplierStatus
{
    Active,
    Inactive,
    Suspended,
    Blocked,
    Preferred
}

public enum SupplierRating
{
    Preferred,
    Standard,
    Probationary,
    Disqualified
}

public class Address
{
    [Key]
    public Guid Id { get; set; }
    
    public AddressType Type { get; set; } = AddressType.Primary;
    
    [MaxLength(200)]
    public string? AddressLine1 { get; set; }
    
    [MaxLength(200)]
    public string? AddressLine2 { get; set; }
    
    [MaxLength(100)]
    public string? City { get; set; }
    
    [MaxLength(100)]
    public string? State { get; set; }
    
    [MaxLength(20)]
    public string? PostalCode { get; set; }
    
    [MaxLength(100)]
    public string? Country { get; set; }
    
    public bool IsDefault { get; set; }
    
    // Foreign keys for various entities
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    
    public Guid? EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum AddressType
{
    Primary,
    Billing,
    Shipping,
    Office,
    Warehouse,
    Home
}

public class Contact
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Title { get; set; }
    
    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Mobile { get; set; }
    
    [MaxLength(100)]
    public string? Department { get; set; }
    
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; } = true;
    
    // Foreign keys
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class BankDetail
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string BankName { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? AccountNumber { get; set; }
    
    [MaxLength(50)]
    public string? RoutingNumber { get; set; }
    
    [MaxLength(50)]
    public string? Iban { get; set; }
    
    [MaxLength(20)]
    public string? SwiftCode { get; set; }
    
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    public bool IsDefault { get; set; }
    
    // Foreign keys
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
