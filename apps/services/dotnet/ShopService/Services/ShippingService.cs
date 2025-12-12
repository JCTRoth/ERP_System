using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IShippingService
{
    Task<ShippingMethod?> GetByIdAsync(Guid id);
    Task<IEnumerable<ShippingMethod>> GetAllAsync();
    Task<IEnumerable<ShippingMethod>> GetActiveAsync();
    Task<IEnumerable<ShippingMethod>> GetAvailableForOrderAsync(decimal orderTotal, string? country, decimal? weight);
    Task<ShippingMethod> CreateAsync(CreateShippingMethodInput input);
    Task<ShippingMethod?> UpdateAsync(Guid id, CreateShippingMethodInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<decimal> CalculateShippingAsync(Guid methodId, decimal orderTotal);
}

public class ShippingService : IShippingService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<ShippingService> _logger;

    public ShippingService(ShopDbContext context, ILogger<ShippingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ShippingMethod?> GetByIdAsync(Guid id)
    {
        return await _context.ShippingMethods.FindAsync(id);
    }

    public async Task<IEnumerable<ShippingMethod>> GetAllAsync()
    {
        return await _context.ShippingMethods
            .OrderBy(s => s.SortOrder)
            .ToListAsync();
    }

    public async Task<IEnumerable<ShippingMethod>> GetActiveAsync()
    {
        return await _context.ShippingMethods
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();
    }

    public async Task<IEnumerable<ShippingMethod>> GetAvailableForOrderAsync(decimal orderTotal, string? country, decimal? weight)
    {
        var methods = await _context.ShippingMethods
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return methods.Where(m =>
        {
            // Check weight limit
            if (weight.HasValue && m.MaxWeight.HasValue && weight > m.MaxWeight)
                return false;

            // Check country availability
            if (!string.IsNullOrEmpty(country) && !string.IsNullOrEmpty(m.AvailableCountries))
            {
                var countries = m.AvailableCountries.Split(',').Select(c => c.Trim().ToUpper());
                if (!countries.Contains(country.ToUpper()) && !countries.Contains("*"))
                    return false;
            }

            return true;
        });
    }

    public async Task<ShippingMethod> CreateAsync(CreateShippingMethodInput input)
    {
        var method = new ShippingMethod
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Description = input.Description,
            Code = input.Code,
            Carrier = input.Carrier,
            Price = input.Price,
            FreeShippingThreshold = input.FreeShippingThreshold,
            EstimatedDeliveryDays = input.EstimatedDeliveryDays,
            IsActive = input.IsActive,
            SortOrder = input.SortOrder,
            AvailableCountries = input.AvailableCountries,
            MaxWeight = input.MaxWeight,
            CreatedAt = DateTime.UtcNow
        };

        _context.ShippingMethods.Add(method);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Shipping method created: {MethodId} - {MethodName}", method.Id, method.Name);

        return method;
    }

    public async Task<ShippingMethod?> UpdateAsync(Guid id, CreateShippingMethodInput input)
    {
        var method = await _context.ShippingMethods.FindAsync(id);
        if (method == null) return null;

        method.Name = input.Name;
        method.Description = input.Description;
        method.Code = input.Code;
        method.Carrier = input.Carrier;
        method.Price = input.Price;
        method.FreeShippingThreshold = input.FreeShippingThreshold;
        method.EstimatedDeliveryDays = input.EstimatedDeliveryDays;
        method.IsActive = input.IsActive;
        method.SortOrder = input.SortOrder;
        method.AvailableCountries = input.AvailableCountries;
        method.MaxWeight = input.MaxWeight;
        method.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Shipping method updated: {MethodId}", method.Id);

        return method;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var method = await _context.ShippingMethods.FindAsync(id);
        if (method == null) return false;

        // Check if used in orders
        var hasOrders = await _context.Orders.AnyAsync(o => o.ShippingMethodId == id);
        if (hasOrders)
        {
            // Soft delete - deactivate instead
            method.IsActive = false;
            method.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        _context.ShippingMethods.Remove(method);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Shipping method deleted: {MethodId}", id);
        return true;
    }

    public async Task<decimal> CalculateShippingAsync(Guid methodId, decimal orderTotal)
    {
        var method = await GetByIdAsync(methodId);
        if (method == null) return 0;

        // Check free shipping threshold
        if (method.FreeShippingThreshold.HasValue && orderTotal >= method.FreeShippingThreshold)
        {
            return 0;
        }

        return method.Price;
    }
}
