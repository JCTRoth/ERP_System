using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface ICouponService
{
    Task<Coupon?> GetByIdAsync(Guid id);
    Task<Coupon?> GetByCodeAsync(string code);
    Task<IEnumerable<Coupon>> GetAllAsync();
    Task<IEnumerable<Coupon>> GetActiveAsync();
    Task<Coupon> CreateAsync(CreateCouponInput input);
    Task<Coupon?> UpdateAsync(Guid id, CreateCouponInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ValidateCouponAsync(string code, decimal orderTotal, Guid? customerId);
    Task<decimal?> ApplyCouponAsync(string code, decimal orderTotal, Guid? customerId);
}

public class CouponService : ICouponService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<CouponService> _logger;

    public CouponService(ShopDbContext context, ILogger<CouponService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Coupon?> GetByIdAsync(Guid id)
    {
        return await _context.Coupons.FindAsync(id);
    }

    public async Task<Coupon?> GetByCodeAsync(string code)
    {
        return await _context.Coupons
            .FirstOrDefaultAsync(c => c.Code.ToLower() == code.ToLower());
    }

    public async Task<IEnumerable<Coupon>> GetAllAsync()
    {
        return await _context.Coupons
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Coupon>> GetActiveAsync()
    {
        var now = DateTime.UtcNow;
        return await _context.Coupons
            .Where(c => c.IsActive &&
                        (c.StartsAt == null || c.StartsAt <= now) &&
                        (c.ExpiresAt == null || c.ExpiresAt > now) &&
                        (c.UsageLimit == null || c.UsageCount < c.UsageLimit))
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<Coupon> CreateAsync(CreateCouponInput input)
    {
        var coupon = new Coupon
        {
            Id = Guid.NewGuid(),
            Code = input.Code.ToUpper(),
            Description = input.Description,
            Type = Enum.Parse<CouponType>(input.Type),
            Value = input.Value,
            MinimumOrderAmount = input.MinimumOrderAmount,
            MaximumDiscountAmount = input.MaximumDiscountAmount,
            UsageLimit = input.UsageLimit,
            UsageLimitPerCustomer = input.UsageLimitPerCustomer,
            UsageCount = 0,
            IsActive = input.IsActive,
            StartsAt = input.StartsAt,
            ExpiresAt = input.ExpiresAt,
            ApplicableCategories = input.ApplicableCategories,
            ApplicableProducts = input.ApplicableProducts,
            CreatedAt = DateTime.UtcNow
        };

        _context.Coupons.Add(coupon);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Coupon created: {CouponCode}", coupon.Code);

        return coupon;
    }

    public async Task<Coupon?> UpdateAsync(Guid id, CreateCouponInput input)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon == null) return null;

        coupon.Code = input.Code.ToUpper();
        coupon.Description = input.Description;
        coupon.Type = Enum.Parse<CouponType>(input.Type);
        coupon.Value = input.Value;
        coupon.MinimumOrderAmount = input.MinimumOrderAmount;
        coupon.MaximumDiscountAmount = input.MaximumDiscountAmount;
        coupon.UsageLimit = input.UsageLimit;
        coupon.UsageLimitPerCustomer = input.UsageLimitPerCustomer;
        coupon.IsActive = input.IsActive;
        coupon.StartsAt = input.StartsAt;
        coupon.ExpiresAt = input.ExpiresAt;
        coupon.ApplicableCategories = input.ApplicableCategories;
        coupon.ApplicableProducts = input.ApplicableProducts;
        coupon.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Coupon updated: {CouponCode}", coupon.Code);

        return coupon;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon == null) return false;

        _context.Coupons.Remove(coupon);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Coupon deleted: {CouponCode}", coupon.Code);
        return true;
    }

    public async Task<bool> ValidateCouponAsync(string code, decimal orderTotal, Guid? customerId)
    {
        var coupon = await GetByCodeAsync(code);
        if (coupon == null) return false;

        var now = DateTime.UtcNow;

        // Check if active
        if (!coupon.IsActive) return false;

        // Check date range
        if (coupon.StartsAt.HasValue && coupon.StartsAt > now) return false;
        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt <= now) return false;

        // Check usage limit
        if (coupon.UsageLimit.HasValue && coupon.UsageCount >= coupon.UsageLimit) return false;

        // Check minimum order amount
        if (coupon.MinimumOrderAmount.HasValue && orderTotal < coupon.MinimumOrderAmount) return false;

        // TODO: Check per-customer usage limit if customerId provided

        return true;
    }

    public async Task<decimal?> ApplyCouponAsync(string code, decimal orderTotal, Guid? customerId)
    {
        if (!await ValidateCouponAsync(code, orderTotal, customerId))
            return null;

        var coupon = await GetByCodeAsync(code);
        if (coupon == null) return null;

        decimal discount;

        if (coupon.Type == CouponType.Percentage)
        {
            discount = orderTotal * (coupon.Value / 100);
        }
        else // FixedAmount
        {
            discount = coupon.Value;
        }

        // Apply maximum discount limit
        if (coupon.MaximumDiscountAmount.HasValue && discount > coupon.MaximumDiscountAmount)
        {
            discount = coupon.MaximumDiscountAmount.Value;
        }

        // Discount cannot exceed order total
        if (discount > orderTotal)
        {
            discount = orderTotal;
        }

        // Increment usage count
        coupon.UsageCount++;
        coupon.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Coupon {CouponCode} applied: Discount {Discount}", code, discount);

        return discount;
    }
}
