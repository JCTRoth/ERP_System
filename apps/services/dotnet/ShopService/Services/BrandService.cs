using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IBrandService
{
    Task<Brand?> GetByIdAsync(Guid id);
    Task<IEnumerable<Brand>> GetAllAsync();
    Task<IEnumerable<Brand>> GetActiveAsync();
    Task<Brand> CreateAsync(CreateBrandInput input);
    Task<Brand?> UpdateAsync(UpdateBrandInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class BrandService : IBrandService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<BrandService> _logger;

    public BrandService(ShopDbContext context, ILogger<BrandService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Brand?> GetByIdAsync(Guid id)
    {
        return await _context.Brands
            .Include(b => b.Products)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<IEnumerable<Brand>> GetAllAsync()
    {
        return await _context.Brands
            .OrderBy(b => b.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<Brand>> GetActiveAsync()
    {
        return await _context.Brands
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .ToListAsync();
    }

    public async Task<Brand> CreateAsync(CreateBrandInput input)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Description = input.Description,
            Slug = input.Slug ?? GenerateSlug(input.Name),
            LogoUrl = input.LogoUrl,
            WebsiteUrl = input.WebsiteUrl,
            IsActive = input.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Brand created: {BrandId} - {BrandName}", brand.Id, brand.Name);

        return brand;
    }

    public async Task<Brand?> UpdateAsync(UpdateBrandInput input)
    {
        var brand = await _context.Brands.FindAsync(input.Id);
        if (brand == null) return null;

        if (!string.IsNullOrEmpty(input.Name)) brand.Name = input.Name;
        if (input.Description != null) brand.Description = input.Description;
        if (input.Slug != null) brand.Slug = input.Slug;
        if (input.LogoUrl != null) brand.LogoUrl = input.LogoUrl;
        if (input.WebsiteUrl != null) brand.WebsiteUrl = input.WebsiteUrl;
        if (input.IsActive.HasValue) brand.IsActive = input.IsActive.Value;

        brand.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Brand updated: {BrandId}", brand.Id);

        return brand;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand == null) return false;

        // Check for products
        var hasProducts = await _context.Products.AnyAsync(p => p.BrandId == id);
        if (hasProducts)
        {
            _logger.LogWarning("Cannot delete brand {BrandId} - has products", id);
            return false;
        }

        _context.Brands.Remove(brand);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Brand deleted: {BrandId}", id);
        return true;
    }

    private static string GenerateSlug(string name)
    {
        return name.ToLower()
            .Replace(" ", "-")
            .Replace("ä", "ae")
            .Replace("ö", "oe")
            .Replace("ü", "ue")
            .Replace("ß", "ss");
    }
}
