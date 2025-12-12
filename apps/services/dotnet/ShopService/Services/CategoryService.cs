using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface ICategoryService
{
    Task<Category?> GetByIdAsync(Guid id);
    Task<IEnumerable<Category>> GetAllAsync();
    Task<IEnumerable<Category>> GetRootCategoriesAsync();
    Task<IEnumerable<Category>> GetSubCategoriesAsync(Guid parentId);
    Task<Category> CreateAsync(CreateCategoryInput input);
    Task<Category?> UpdateAsync(UpdateCategoryInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class CategoryService : ICategoryService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(ShopDbContext context, ILogger<CategoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Category?> GetByIdAsync(Guid id)
    {
        return await _context.Categories
            .Include(c => c.SubCategories)
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<IEnumerable<Category>> GetAllAsync()
    {
        return await _context.Categories
            .Include(c => c.SubCategories)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
    }

    public async Task<IEnumerable<Category>> GetRootCategoriesAsync()
    {
        return await _context.Categories
            .Include(c => c.SubCategories)
            .Where(c => c.ParentCategoryId == null && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
    }

    public async Task<IEnumerable<Category>> GetSubCategoriesAsync(Guid parentId)
    {
        return await _context.Categories
            .Where(c => c.ParentCategoryId == parentId && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();
    }

    public async Task<Category> CreateAsync(CreateCategoryInput input)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Description = input.Description,
            Slug = input.Slug ?? GenerateSlug(input.Name),
            ParentCategoryId = input.ParentCategoryId,
            SortOrder = input.SortOrder,
            IsActive = input.IsActive,
            ImageUrl = input.ImageUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Category created: {CategoryId} - {CategoryName}", category.Id, category.Name);

        return category;
    }

    public async Task<Category?> UpdateAsync(UpdateCategoryInput input)
    {
        var category = await _context.Categories.FindAsync(input.Id);
        if (category == null) return null;

        if (!string.IsNullOrEmpty(input.Name)) category.Name = input.Name;
        if (input.Description != null) category.Description = input.Description;
        if (input.Slug != null) category.Slug = input.Slug;
        if (input.ParentCategoryId.HasValue) category.ParentCategoryId = input.ParentCategoryId;
        if (input.SortOrder.HasValue) category.SortOrder = input.SortOrder.Value;
        if (input.IsActive.HasValue) category.IsActive = input.IsActive.Value;
        if (input.ImageUrl != null) category.ImageUrl = input.ImageUrl;

        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Category updated: {CategoryId}", category.Id);

        return category;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return false;

        // Check for subcategories
        var hasSubCategories = await _context.Categories.AnyAsync(c => c.ParentCategoryId == id);
        if (hasSubCategories)
        {
            _logger.LogWarning("Cannot delete category {CategoryId} - has subcategories", id);
            return false;
        }

        // Check for products
        var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id);
        if (hasProducts)
        {
            _logger.LogWarning("Cannot delete category {CategoryId} - has products", id);
            return false;
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Category deleted: {CategoryId}", id);
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
