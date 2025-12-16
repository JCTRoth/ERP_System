using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AccountingService.Models;

public class InvoiceLineItem
{
    [Key]
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    [JsonIgnore]
    public Invoice Invoice { get; set; } = null!;

    public int LineNumber { get; set; }

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Sku { get; set; }

    public Guid? ProductId { get; set; }

    public Guid? AccountId { get; set; }

    public Account? Account { get; set; }

    public int Quantity { get; set; } = 1;

    [MaxLength(20)]
    public string? Unit { get; set; } = "pcs";

    [Column(TypeName = "decimal(18,4)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column(TypeName = "decimal(5,4)")]
    public decimal DiscountPercent { get; set; } = 0;

    [Column(TypeName = "decimal(5,4)")]
    public decimal TaxRate { get; set; } = 0.19m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
