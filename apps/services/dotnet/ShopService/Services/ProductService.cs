using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IProductService
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<IEnumerable<Product>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Product>> GetByCategoryAsync(Guid categoryId);
    Task<IEnumerable<Product>> GetByBrandAsync(Guid brandId);
    Task<IEnumerable<Product>> SearchAsync(string searchTerm);
    Task<IEnumerable<Product>> GetFeaturedAsync(int take = 10);
    Task<IEnumerable<Product>> GetLowStockAsync(int threshold = 10);
    Task<Product> CreateAsync(CreateProductInput input);
    Task<Product?> UpdateAsync(UpdateProductInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<ProductImage> AddImageAsync(Guid productId, string url, string? altText, bool isPrimary);
    Task<bool> RemoveImageAsync(Guid imageId);
    Task<ProductVariant> AddVariantAsync(Guid productId, CreateVariantInput input);
    Task<bool> RemoveVariantAsync(Guid variantId);
}

public class ProductService : IProductService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<ProductService> _logger;
    private readonly IInventoryService _inventoryService;

    public ProductService(ShopDbContext context, ILogger<ProductService> logger, IInventoryService inventoryService)
    {
        _context = context;
        _logger = logger;
        _inventoryService = inventoryService;
    }

    public async Task<Product?> GetByIdAsync(Guid id)
    {
        return await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Include(p => p.Attributes)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Product>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Product>> GetByCategoryAsync(Guid categoryId)
    {
        return await _context.Products
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.CategoryId == categoryId && p.Status == ProductStatus.Active)
            .ToListAsync();
    }

    public async Task<IEnumerable<Product>> GetByBrandAsync(Guid brandId)
    {
        return await _context.Products
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.BrandId == brandId && p.Status == ProductStatus.Active)
            .ToListAsync();
    }

    public async Task<IEnumerable<Product>> SearchAsync(string searchTerm)
    {
        var term = searchTerm.ToLower();
        return await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.Name.ToLower().Contains(term) ||
                        (p.Description != null && p.Description.ToLower().Contains(term)) ||
                        p.Sku.ToLower().Contains(term) ||
                        (p.Ean != null && p.Ean.Contains(term)))
            .Take(50)
            .ToListAsync();
    }

    public async Task<IEnumerable<Product>> GetFeaturedAsync(int take = 10)
    {
        return await _context.Products
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.IsFeatured && p.Status == ProductStatus.Active)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Product>> GetLowStockAsync(int threshold = 10)
    {
        return await _context.Products
            .Where(p => p.TrackInventory && p.StockQuantity <= threshold)
            .OrderBy(p => p.StockQuantity)
            .ToListAsync();
    }

    public async Task<Product> CreateAsync(CreateProductInput input)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Description = input.Description,
            Sku = input.Sku,
            Ean = input.Ean,
            Price = input.Price,
            CompareAtPrice = input.CompareAtPrice,
            CostPrice = input.CostPrice,
            StockQuantity = input.StockQuantity,
            LowStockThreshold = input.LowStockThreshold ?? 10,
            TrackInventory = input.TrackInventory,
            AllowBackorder = input.AllowBackorder,
            Weight = input.Weight,
            WeightUnit = input.WeightUnit ?? "kg",
            Length = input.Length,
            Width = input.Width,
            Height = input.Height,
            DimensionUnit = input.DimensionUnit ?? "cm",
            CategoryId = input.CategoryId,
            BrandId = input.BrandId,
            SupplierId = input.SupplierId,
            Status = Enum.Parse<ProductStatus>(input.Status),
            IsFeatured = input.IsFeatured,
            IsDigital = input.IsDigital,
            Slug = input.Slug ?? GenerateSlug(input.Name),
            MetaTitle = input.MetaTitle,
            MetaDescription = input.MetaDescription,
            CreatedAt = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Product created: {ProductId} - {ProductName}", product.Id, product.Name);

        return product;
    }

    public async Task<Product?> UpdateAsync(UpdateProductInput input)
    {
        var product = await _context.Products.FindAsync(input.Id);
        if (product == null) return null;

        if (!string.IsNullOrEmpty(input.Name)) product.Name = input.Name;
        if (input.Description != null) product.Description = input.Description;
        if (!string.IsNullOrEmpty(input.Sku)) product.Sku = input.Sku;
        if (input.Ean != null) product.Ean = input.Ean;
        if (input.Price.HasValue) product.Price = input.Price.Value;
        if (input.CompareAtPrice.HasValue) product.CompareAtPrice = input.CompareAtPrice;
        if (input.CostPrice.HasValue) product.CostPrice = input.CostPrice.Value;
        if (input.StockQuantity.HasValue) product.StockQuantity = input.StockQuantity.Value;
        if (input.LowStockThreshold.HasValue) product.LowStockThreshold = input.LowStockThreshold;
        if (input.TrackInventory.HasValue) product.TrackInventory = input.TrackInventory.Value;
        if (input.AllowBackorder.HasValue) product.AllowBackorder = input.AllowBackorder.Value;
        if (input.Weight.HasValue) product.Weight = input.Weight;
        if (!string.IsNullOrEmpty(input.WeightUnit)) product.WeightUnit = input.WeightUnit;
        if (input.Length.HasValue) product.Length = input.Length;
        if (input.Width.HasValue) product.Width = input.Width;
        if (input.Height.HasValue) product.Height = input.Height;
        if (!string.IsNullOrEmpty(input.DimensionUnit)) product.DimensionUnit = input.DimensionUnit;
        if (input.CategoryId.HasValue) product.CategoryId = input.CategoryId;
        if (input.BrandId.HasValue) product.BrandId = input.BrandId;
        if (input.SupplierId.HasValue) product.SupplierId = input.SupplierId;
        if (!string.IsNullOrEmpty(input.Status)) product.Status = Enum.Parse<ProductStatus>(input.Status);
        if (input.IsFeatured.HasValue) product.IsFeatured = input.IsFeatured.Value;
        if (input.IsDigital.HasValue) product.IsDigital = input.IsDigital.Value;
        if (input.Slug != null) product.Slug = input.Slug;
        if (input.MetaTitle != null) product.MetaTitle = input.MetaTitle;
        if (input.MetaDescription != null) product.MetaDescription = input.MetaDescription;

        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Product updated: {ProductId}", product.Id);

        return product;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return false;

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Product deleted: {ProductId}", id);
        return true;
    }

    public async Task<ProductImage> AddImageAsync(Guid productId, string url, string? altText, bool isPrimary)
    {
        if (isPrimary)
        {
            var existingPrimary = await _context.ProductImages
                .Where(i => i.ProductId == productId && i.IsPrimary)
                .ToListAsync();
            foreach (var img in existingPrimary)
            {
                img.IsPrimary = false;
            }
        }

        var maxSort = await _context.ProductImages
            .Where(i => i.ProductId == productId)
            .MaxAsync(i => (int?)i.SortOrder) ?? 0;

        var image = new ProductImage
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Url = url,
            AltText = altText,
            IsPrimary = isPrimary,
            SortOrder = maxSort + 1,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProductImages.Add(image);
        await _context.SaveChangesAsync();

        return image;
    }

    public async Task<bool> RemoveImageAsync(Guid imageId)
    {
        var image = await _context.ProductImages.FindAsync(imageId);
        if (image == null) return false;

        _context.ProductImages.Remove(image);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<ProductVariant> AddVariantAsync(Guid productId, CreateVariantInput input)
    {
        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Name = input.Name,
            Sku = input.Sku,
            Ean = input.Ean,
            Price = input.Price,
            CompareAtPrice = input.CompareAtPrice,
            CostPrice = input.CostPrice,
            StockQuantity = input.StockQuantity,
            Weight = input.Weight,
            IsActive = input.IsActive,
            ImageUrl = input.ImageUrl,
            Options = input.Options,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();

        return variant;
    }

    public async Task<bool> RemoveVariantAsync(Guid variantId)
    {
        var variant = await _context.ProductVariants.FindAsync(variantId);
        if (variant == null) return false;

        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();

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

public record CreateVariantInput(
    string Name,
    string Sku,
    string? Ean,
    decimal Price,
    decimal? CompareAtPrice,
    decimal CostPrice,
    int StockQuantity,
    decimal? Weight,
    bool IsActive,
    string? ImageUrl,
    string? Options
);
