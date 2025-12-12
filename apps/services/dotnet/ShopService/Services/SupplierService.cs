using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface ISupplierService
{
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<IEnumerable<Supplier>> GetAllAsync();
    Task<IEnumerable<Supplier>> GetActiveAsync();
    Task<Supplier> CreateAsync(CreateSupplierInput input);
    Task<Supplier?> UpdateAsync(UpdateSupplierInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class SupplierService : ISupplierService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<SupplierService> _logger;

    public SupplierService(ShopDbContext context, ILogger<SupplierService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Supplier?> GetByIdAsync(Guid id)
    {
        return await _context.Suppliers
            .Include(s => s.Products)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Supplier>> GetAllAsync()
    {
        return await _context.Suppliers
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<Supplier>> GetActiveAsync()
    {
        return await _context.Suppliers
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<Supplier> CreateAsync(CreateSupplierInput input)
    {
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Code = input.Code ?? GenerateCode(input.Name),
            ContactPerson = input.ContactPerson,
            Email = input.Email,
            Phone = input.Phone,
            Address = input.Address,
            City = input.City,
            PostalCode = input.PostalCode,
            Country = input.Country,
            VatNumber = input.VatNumber,
            LeadTimeDays = input.LeadTimeDays,
            Currency = input.Currency,
            IsActive = input.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Supplier created: {SupplierId} - {SupplierName}", supplier.Id, supplier.Name);

        return supplier;
    }

    public async Task<Supplier?> UpdateAsync(UpdateSupplierInput input)
    {
        var supplier = await _context.Suppliers.FindAsync(input.Id);
        if (supplier == null) return null;

        if (!string.IsNullOrEmpty(input.Name)) supplier.Name = input.Name;
        if (input.Code != null) supplier.Code = input.Code;
        if (input.ContactPerson != null) supplier.ContactPerson = input.ContactPerson;
        if (input.Email != null) supplier.Email = input.Email;
        if (input.Phone != null) supplier.Phone = input.Phone;
        if (input.Address != null) supplier.Address = input.Address;
        if (input.City != null) supplier.City = input.City;
        if (input.PostalCode != null) supplier.PostalCode = input.PostalCode;
        if (input.Country != null) supplier.Country = input.Country;
        if (input.VatNumber != null) supplier.VatNumber = input.VatNumber;
        if (input.LeadTimeDays.HasValue) supplier.LeadTimeDays = input.LeadTimeDays.Value;
        if (input.Currency != null) supplier.Currency = input.Currency;
        if (input.IsActive.HasValue) supplier.IsActive = input.IsActive.Value;

        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Supplier updated: {SupplierId}", supplier.Id);

        return supplier;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return false;

        // Check for products
        var hasProducts = await _context.Products.AnyAsync(p => p.SupplierId == id);
        if (hasProducts)
        {
            _logger.LogWarning("Cannot delete supplier {SupplierId} - has products", id);
            return false;
        }

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Supplier deleted: {SupplierId}", id);
        return true;
    }

    private static string GenerateCode(string name)
    {
        return name.ToUpper()
            .Replace(" ", "")
            .Substring(0, Math.Min(10, name.Length));
    }
}
