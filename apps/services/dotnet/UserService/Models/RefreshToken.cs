using System.ComponentModel.DataAnnotations;

namespace UserService.Models;

public class RefreshToken
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Token { get; set; } = string.Empty;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsRevoked { get; set; } = false;

    public string? RevokedReason { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsRevoked && !IsExpired;
}
