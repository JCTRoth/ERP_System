using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopService.Models;

public class AuditLog
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid EntityId { get; set; }

    [Required]
    [MaxLength(50)]
    public string EntityType { get; set; } = string.Empty; // e.g., "Order", "Product", "Customer"

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty; // e.g., "Create", "Update", "Delete", "StatusChange"

    [Required]
    public Guid UserId { get; set; }

    [MaxLength(255)]
    public string? UserEmail { get; set; }

    [MaxLength(255)]
    public string? UserName { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [MaxLength(1000)]
    public string? OldValues { get; set; } // JSON representation of old values

    [MaxLength(1000)]
    public string? NewValues { get; set; } // JSON representation of new values

    [MaxLength(500)]
    public string? Description { get; set; } // Human-readable description

    [MaxLength(500)]
    public string? IpAddress { get; set; }
}
