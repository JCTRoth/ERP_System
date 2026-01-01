using ShopService.Data;
using ShopService.Models;
using System.Text.Json;

namespace ShopService.Services;

public interface IAuditService
{
    Task LogActionAsync(Guid entityId, string entityType, string action, Guid userId, string? userEmail, string? userName, string? oldValues, string? newValues, string? description, string? ipAddress = null);
    Task<IEnumerable<AuditLog>> GetAuditLogsAsync(Guid entityId, string entityType);
    Task<IEnumerable<AuditLog>> GetUserAuditLogsAsync(Guid userId, int skip = 0, int take = 50);
    Task<IEnumerable<AuditLog>> GetAllAuditLogsAsync(int skip = 0, int take = 50);
}

public class AuditService : IAuditService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(ShopDbContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogActionAsync(
        Guid entityId,
        string entityType,
        string action,
        Guid userId,
        string? userEmail,
        string? userName,
        string? oldValues,
        string? newValues,
        string? description,
        string? ipAddress = null)
    {
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            EntityId = entityId,
            EntityType = entityType,
            Action = action,
            UserId = userId,
            UserEmail = userEmail,
            UserName = userName,
            Timestamp = DateTime.UtcNow,
            OldValues = oldValues,
            NewValues = newValues,
            Description = description,
            IpAddress = ipAddress
        };

        _context.AuditLogs.Add(auditLog);
        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Audit log created: {EntityType} {Action} for {EntityId} by {UserId}",
                entityType, action, entityId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating audit log for {EntityType} {Action}", entityType, action);
        }
    }

    public async Task<IEnumerable<AuditLog>> GetAuditLogsAsync(Guid entityId, string entityType)
    {
        return await Task.FromResult(
            _context.AuditLogs
                .Where(a => a.EntityId == entityId && a.EntityType == entityType)
                .OrderByDescending(a => a.Timestamp)
                .ToList()
        );
    }

    public async Task<IEnumerable<AuditLog>> GetUserAuditLogsAsync(Guid userId, int skip = 0, int take = 50)
    {
        return await Task.FromResult(
            _context.AuditLogs
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.Timestamp)
                .Skip(skip)
                .Take(take)
                .ToList()
        );
    }

    public async Task<IEnumerable<AuditLog>> GetAllAuditLogsAsync(int skip = 0, int take = 50)
    {
        return await Task.FromResult(
            _context.AuditLogs
                .OrderByDescending(a => a.Timestamp)
                .Skip(skip)
                .Take(take)
                .ToList()
        );
    }
}
