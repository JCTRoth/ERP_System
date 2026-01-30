using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

/// <summary>
/// Store configuration settings that can be changed at runtime
/// </summary>
[Table("app_configurations")]
public class AppConfiguration
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("key")]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    [Column("value")]
    public string Value { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
