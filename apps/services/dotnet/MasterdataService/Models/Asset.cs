using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MasterdataService.Models;

public class Asset
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string AssetNumber { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public AssetType Type { get; set; } = AssetType.Equipment;
    public AssetStatus Status { get; set; } = AssetStatus.Active;
    
    public Guid? CategoryId { get; set; }
    public AssetCategory? Category { get; set; }
    
    // Financial details
    [Column(TypeName = "decimal(18,2)")]
    public decimal PurchasePrice { get; set; }
    
    public DateTime PurchaseDate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentValue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AccumulatedDepreciation { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? SalvageValue { get; set; }
    
    public int UsefulLifeMonths { get; set; }
    
    public DepreciationMethod DepreciationMethod { get; set; } = DepreciationMethod.StraightLine;
    
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    // Tracking
    [MaxLength(100)]
    public string? SerialNumber { get; set; }
    
    [MaxLength(100)]
    public string? Barcode { get; set; }
    
    [MaxLength(100)]
    public string? Manufacturer { get; set; }
    
    [MaxLength(100)]
    public string? Model { get; set; }
    
    // Assignments
    public Guid? AssignedToId { get; set; }
    public Employee? AssignedTo { get; set; }
    
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    public Guid? LocationId { get; set; }
    public BusinessLocation? Location { get; set; }
    
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
    
    // Warranty and maintenance
    public DateTime? WarrantyExpiry { get; set; }
    public DateTime? LastMaintenanceDate { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    // Disposal
    public DateTime? DisposalDate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? DisposalValue { get; set; }
    
    [MaxLength(200)]
    public string? DisposalReason { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum AssetType
{
    Equipment,
    Vehicle,
    Furniture,
    Computer,
    Software,
    Building,
    Land,
    Machinery,
    IntangibleAsset,
    Other
}

public enum AssetStatus
{
    Active,
    InMaintenance,
    Disposed,
    Lost,
    Transferred,
    Reserved
}

public enum DepreciationMethod
{
    StraightLine,
    DecliningBalance,
    DoubleDecliningBalance,
    SumOfYearsDigits,
    UnitsOfProduction
}

public class AssetCategory
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public Guid? ParentCategoryId { get; set; }
    public AssetCategory? ParentCategory { get; set; }
    
    public int DefaultUsefulLifeMonths { get; set; }
    public DepreciationMethod DefaultDepreciationMethod { get; set; } = DepreciationMethod.StraightLine;
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<AssetCategory> SubCategories { get; set; } = new List<AssetCategory>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class Currency
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(10)]
    public string? Symbol { get; set; }
    
    public int DecimalPlaces { get; set; } = 2;
    
    [Column(TypeName = "decimal(18,6)")]
    public decimal ExchangeRate { get; set; } = 1;
    
    public bool IsBaseCurrency { get; set; }
    public bool IsActive { get; set; } = true;
    
    public DateTime? ExchangeRateDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PaymentTerm
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public int DueDays { get; set; }
    
    public decimal? DiscountPercent { get; set; }
    public int? DiscountDays { get; set; }
    
    public PaymentTermType Type { get; set; } = PaymentTermType.Net;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum PaymentTermType
{
    Net,
    DueOnReceipt,
    EndOfMonth,
    EndOfNextMonth,
    Custom
}

public class UnitOfMeasure
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(10)]
    public string? Symbol { get; set; }
    
    public UomType Type { get; set; } = UomType.Unit;
    
    // Conversion to base unit
    public Guid? BaseUnitId { get; set; }
    public UnitOfMeasure? BaseUnit { get; set; }
    
    [Column(TypeName = "decimal(18,6)")]
    public decimal ConversionFactor { get; set; } = 1;
    
    public bool IsBaseUnit { get; set; }
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum UomType
{
    Unit,
    Weight,
    Volume,
    Length,
    Area,
    Time,
    Custom
}

public class TaxCode
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal Rate { get; set; }
    
    public TaxType Type { get; set; } = TaxType.Sales;
    
    [MaxLength(100)]
    public string? TaxAuthority { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
    
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum TaxType
{
    Sales,
    Purchase,
    VAT,
    GST,
    Withholding,
    Exempt
}
