using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface ICustomerService
{
    Task<Customer?> GetByIdAsync(Guid id);
    Task<Customer?> GetByUserIdAsync(Guid userId);
    Task<Customer?> GetByEmailAsync(string email);
    Task<IEnumerable<Customer>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Customer>> SearchAsync(string searchTerm);
    Task<Customer> CreateAsync(CreateCustomerInput input);
    Task<Customer?> UpdateAsync(UpdateCustomerInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<Customer> GetOrCreateByUserIdAsync(Guid userId, string email, string? firstName, string? lastName);
}

public class CustomerService : ICustomerService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(ShopDbContext context, ILogger<CustomerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Customer?> GetByIdAsync(Guid id)
    {
        return await _context.Customers
            .Include(c => c.Orders)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Customer?> GetByUserIdAsync(Guid userId)
    {
        return await _context.Customers
            .Include(c => c.Orders)
            .FirstOrDefaultAsync(c => c.UserId == userId);
    }

    public async Task<Customer?> GetByEmailAsync(string email)
    {
        return await _context.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == email.ToLower());
    }

    public async Task<IEnumerable<Customer>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Customers
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Customer>> SearchAsync(string searchTerm)
    {
        var term = searchTerm.ToLower();
        return await _context.Customers
            .Where(c => c.Email.ToLower().Contains(term) ||
                        (c.FirstName != null && c.FirstName.ToLower().Contains(term)) ||
                        (c.LastName != null && c.LastName.ToLower().Contains(term)) ||
                        (c.Company != null && c.Company.ToLower().Contains(term)))
            .Take(50)
            .ToListAsync();
    }

    public async Task<Customer> CreateAsync(CreateCustomerInput input)
    {
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            UserId = input.UserId,
            Email = input.Email,
            FirstName = input.FirstName,
            LastName = input.LastName,
            Phone = input.Phone,
            Company = input.Company,
            VatNumber = input.VatNumber,
            DefaultShippingAddress = input.DefaultShippingAddress,
            DefaultShippingCity = input.DefaultShippingCity,
            DefaultShippingPostalCode = input.DefaultShippingPostalCode,
            DefaultShippingCountry = input.DefaultShippingCountry,
            DefaultBillingAddress = input.DefaultBillingAddress,
            DefaultBillingCity = input.DefaultBillingCity,
            DefaultBillingPostalCode = input.DefaultBillingPostalCode,
            DefaultBillingCountry = input.DefaultBillingCountry,
            Type = Enum.Parse<CustomerType>(input.Type),
            AcceptsMarketing = input.AcceptsMarketing,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer created: {CustomerId} - {CustomerEmail}", customer.Id, customer.Email);

        return customer;
    }

    public async Task<Customer?> UpdateAsync(UpdateCustomerInput input)
    {
        var customer = await _context.Customers.FindAsync(input.Id);
        if (customer == null) return null;

        if (!string.IsNullOrEmpty(input.Email)) customer.Email = input.Email;
        if (input.FirstName != null) customer.FirstName = input.FirstName;
        if (input.LastName != null) customer.LastName = input.LastName;
        if (input.Phone != null) customer.Phone = input.Phone;
        if (input.Company != null) customer.Company = input.Company;
        if (input.VatNumber != null) customer.VatNumber = input.VatNumber;
        if (input.DefaultShippingAddress != null) customer.DefaultShippingAddress = input.DefaultShippingAddress;
        if (input.DefaultShippingCity != null) customer.DefaultShippingCity = input.DefaultShippingCity;
        if (input.DefaultShippingPostalCode != null) customer.DefaultShippingPostalCode = input.DefaultShippingPostalCode;
        if (input.DefaultShippingCountry != null) customer.DefaultShippingCountry = input.DefaultShippingCountry;
        if (input.DefaultBillingAddress != null) customer.DefaultBillingAddress = input.DefaultBillingAddress;
        if (input.DefaultBillingCity != null) customer.DefaultBillingCity = input.DefaultBillingCity;
        if (input.DefaultBillingPostalCode != null) customer.DefaultBillingPostalCode = input.DefaultBillingPostalCode;
        if (input.DefaultBillingCountry != null) customer.DefaultBillingCountry = input.DefaultBillingCountry;
        if (!string.IsNullOrEmpty(input.Type)) customer.Type = Enum.Parse<CustomerType>(input.Type);
        if (input.IsActive.HasValue) customer.IsActive = input.IsActive.Value;
        if (input.AcceptsMarketing.HasValue) customer.AcceptsMarketing = input.AcceptsMarketing.Value;

        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Customer updated: {CustomerId}", customer.Id);

        return customer;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return false;

        // Check for orders
        var hasOrders = await _context.Orders.AnyAsync(o => o.CustomerId == id);
        if (hasOrders)
        {
            // Soft delete - deactivate instead
            customer.IsActive = false;
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Customer deactivated: {CustomerId}", id);
            return true;
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer deleted: {CustomerId}", id);
        return true;
    }

    public async Task<Customer> GetOrCreateByUserIdAsync(Guid userId, string email, string? firstName, string? lastName)
    {
        var existing = await GetByUserIdAsync(userId);
        if (existing != null) return existing;

        return await CreateAsync(new CreateCustomerInput(
            UserId: userId,
            Email: email,
            FirstName: firstName,
            LastName: lastName,
            Phone: null,
            Company: null,
            VatNumber: null,
            DefaultShippingAddress: null,
            DefaultShippingCity: null,
            DefaultShippingPostalCode: null,
            DefaultShippingCountry: null,
            DefaultBillingAddress: null,
            DefaultBillingCity: null,
            DefaultBillingPostalCode: null,
            DefaultBillingCountry: null,
            Type: "Individual",
            AcceptsMarketing: false
        ));
    }
}
