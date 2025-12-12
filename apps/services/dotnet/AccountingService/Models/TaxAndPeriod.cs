using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountingService.Models;

/// <summary>
/// Represents tax configuration and rates
/// </summary>
public class TaxRate
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [Column(TypeName = "decimal(5,4)")]
    public decimal Rate { get; set; }

    [MaxLength(100)]
    public string? Description { get; set; }

    public TaxType Type { get; set; } = TaxType.VAT;

    [MaxLength(10)]
    public string? Country { get; set; } = "DE";

    public bool IsDefault { get; set; } = false;

    public bool IsActive { get; set; } = true;

    public DateTime? EffectiveFrom { get; set; }

    public DateTime? EffectiveUntil { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public enum TaxType
{
    VAT,
    SalesTax,
    IncomeTax,
    WithholdingTax,
    ExciseTax,
    Other
}

/// <summary>
/// Fiscal period for reporting
/// </summary>
public class FiscalPeriod
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string Name { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Period { get; set; }  // 1-12 for monthly, 1-4 for quarterly

    public FiscalPeriodType Type { get; set; } = FiscalPeriodType.Monthly;

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public FiscalPeriodStatus Status { get; set; } = FiscalPeriodStatus.Open;

    public DateTime? ClosedAt { get; set; }

    public Guid? ClosedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum FiscalPeriodType
{
    Monthly,
    Quarterly,
    Yearly
}

public enum FiscalPeriodStatus
{
    Future,
    Open,
    Closing,
    Closed
}
