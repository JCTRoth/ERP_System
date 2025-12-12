using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.DTOs;
using MasterdataService.Models;

namespace MasterdataService.Services;

public interface ISupplierService
{
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<Supplier?> GetByNumberAsync(string supplierNumber);
    Task<IEnumerable<Supplier>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Supplier>> SearchAsync(string query);
    Task<IEnumerable<Supplier>> GetByRatingAsync(SupplierRating rating);
    Task<Supplier> CreateAsync(CreateSupplierInput input);
    Task<Supplier?> UpdateAsync(Guid id, UpdateSupplierInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<Address> AddAddressAsync(Guid supplierId, CreateAddressInput input);
    Task<Contact> AddContactAsync(Guid supplierId, CreateContactInput input);
    Task<BankDetail> AddBankDetailAsync(Guid supplierId, CreateBankDetailInput input);
}

public class SupplierService : ISupplierService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<SupplierService> _logger;

    public SupplierService(MasterdataDbContext context, ILogger<SupplierService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Supplier?> GetByIdAsync(Guid id)
    {
        return await _context.Suppliers
            .Include(s => s.Addresses)
            .Include(s => s.Contacts)
            .Include(s => s.BankDetails)
            .Include(s => s.DefaultCurrency)
            .Include(s => s.DefaultPaymentTerm)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<Supplier?> GetByNumberAsync(string supplierNumber)
    {
        return await _context.Suppliers
            .Include(s => s.Addresses)
            .Include(s => s.Contacts)
            .FirstOrDefaultAsync(s => s.SupplierNumber == supplierNumber);
    }

    public async Task<IEnumerable<Supplier>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Suppliers
            .Include(s => s.Addresses.Where(a => a.IsDefault))
            .OrderBy(s => s.Name)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Supplier>> SearchAsync(string query)
    {
        return await _context.Suppliers
            .Where(s => s.Name.Contains(query) ||
                       s.SupplierNumber.Contains(query) ||
                       (s.Email != null && s.Email.Contains(query)))
            .OrderBy(s => s.Name)
            .Take(50)
            .ToListAsync();
    }

    public async Task<IEnumerable<Supplier>> GetByRatingAsync(SupplierRating rating)
    {
        return await _context.Suppliers
            .Where(s => s.Rating == rating && s.Status == SupplierStatus.Active)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<Supplier> CreateAsync(CreateSupplierInput input)
    {
        var supplierNumber = await GenerateSupplierNumberAsync();

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierNumber = supplierNumber,
            Name = input.Name,
            Type = Enum.Parse<SupplierType>(input.Type),
            ContactPerson = input.ContactPerson,
            Email = input.Email,
            Phone = input.Phone,
            Fax = input.Fax,
            Website = input.Website,
            TaxId = input.TaxId,
            DefaultCurrencyId = input.DefaultCurrencyId,
            DefaultPaymentTermId = input.DefaultPaymentTermId,
            LeadTimeDays = input.LeadTimeDays ?? 0,
            MinimumOrderValue = input.MinimumOrderValue ?? 0,
            Status = SupplierStatus.Active,
            Rating = SupplierRating.Standard,
            Notes = input.Notes,
            CreatedAt = DateTime.UtcNow
        };

        // Add addresses
        if (input.Addresses != null)
        {
            foreach (var addr in input.Addresses)
            {
                supplier.Addresses.Add(new Address
                {
                    Id = Guid.NewGuid(),
                    Type = Enum.Parse<AddressType>(addr.Type),
                    AddressLine1 = addr.AddressLine1,
                    AddressLine2 = addr.AddressLine2,
                    City = addr.City,
                    State = addr.State,
                    PostalCode = addr.PostalCode,
                    Country = addr.Country,
                    IsDefault = addr.IsDefault,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Add contacts
        if (input.Contacts != null)
        {
            foreach (var contact in input.Contacts)
            {
                supplier.Contacts.Add(new Contact
                {
                    Id = Guid.NewGuid(),
                    FirstName = contact.FirstName,
                    LastName = contact.LastName,
                    Title = contact.Title,
                    Email = contact.Email,
                    Phone = contact.Phone,
                    Mobile = contact.Mobile,
                    Department = contact.Department,
                    IsPrimary = contact.IsPrimary,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Supplier created: {SupplierNumber} - {Name}",
            supplierNumber, supplier.Name);

        return supplier;
    }

    public async Task<Supplier?> UpdateAsync(Guid id, UpdateSupplierInput input)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            supplier.Name = input.Name;

        if (!string.IsNullOrEmpty(input.Type))
            supplier.Type = Enum.Parse<SupplierType>(input.Type);

        if (input.ContactPerson != null)
            supplier.ContactPerson = input.ContactPerson;

        if (input.Email != null)
            supplier.Email = input.Email;

        if (input.Phone != null)
            supplier.Phone = input.Phone;

        if (input.Fax != null)
            supplier.Fax = input.Fax;

        if (input.Website != null)
            supplier.Website = input.Website;

        if (input.TaxId != null)
            supplier.TaxId = input.TaxId;

        if (input.DefaultCurrencyId.HasValue)
            supplier.DefaultCurrencyId = input.DefaultCurrencyId;

        if (input.DefaultPaymentTermId.HasValue)
            supplier.DefaultPaymentTermId = input.DefaultPaymentTermId;

        if (input.LeadTimeDays.HasValue)
            supplier.LeadTimeDays = input.LeadTimeDays.Value;

        if (input.MinimumOrderValue.HasValue)
            supplier.MinimumOrderValue = input.MinimumOrderValue.Value;

        if (!string.IsNullOrEmpty(input.Status))
            supplier.Status = Enum.Parse<SupplierStatus>(input.Status);

        if (!string.IsNullOrEmpty(input.Rating))
            supplier.Rating = Enum.Parse<SupplierRating>(input.Rating);

        if (input.Notes != null)
            supplier.Notes = input.Notes;

        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Supplier updated: {SupplierNumber}", supplier.SupplierNumber);

        return supplier;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return false;

        supplier.Status = SupplierStatus.Inactive;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Supplier deactivated: {SupplierNumber}", supplier.SupplierNumber);

        return true;
    }

    public async Task<Address> AddAddressAsync(Guid supplierId, CreateAddressInput input)
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            Type = Enum.Parse<AddressType>(input.Type),
            AddressLine1 = input.AddressLine1,
            AddressLine2 = input.AddressLine2,
            City = input.City,
            State = input.State,
            PostalCode = input.PostalCode,
            Country = input.Country,
            IsDefault = input.IsDefault,
            CreatedAt = DateTime.UtcNow
        };

        if (input.IsDefault)
        {
            await _context.Addresses
                .Where(a => a.SupplierId == supplierId && a.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false));
        }

        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();

        return address;
    }

    public async Task<Contact> AddContactAsync(Guid supplierId, CreateContactInput input)
    {
        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            FirstName = input.FirstName,
            LastName = input.LastName,
            Title = input.Title,
            Email = input.Email,
            Phone = input.Phone,
            Mobile = input.Mobile,
            Department = input.Department,
            IsPrimary = input.IsPrimary,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        if (input.IsPrimary)
        {
            await _context.Contacts
                .Where(c => c.SupplierId == supplierId && c.IsPrimary)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsPrimary, false));
        }

        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync();

        return contact;
    }

    public async Task<BankDetail> AddBankDetailAsync(Guid supplierId, CreateBankDetailInput input)
    {
        var bankDetail = new BankDetail
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            BankName = input.BankName,
            AccountNumber = input.AccountNumber,
            RoutingNumber = input.RoutingNumber,
            Iban = input.Iban,
            SwiftCode = input.SwiftCode,
            Currency = input.Currency ?? "USD",
            IsDefault = input.IsDefault,
            CreatedAt = DateTime.UtcNow
        };

        if (input.IsDefault)
        {
            await _context.BankDetails
                .Where(b => b.SupplierId == supplierId && b.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDefault, false));
        }

        _context.BankDetails.Add(bankDetail);
        await _context.SaveChangesAsync();

        return bankDetail;
    }

    private async Task<string> GenerateSupplierNumberAsync()
    {
        var lastSupplier = await _context.Suppliers
            .OrderByDescending(s => s.SupplierNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastSupplier != null)
        {
            var lastNum = lastSupplier.SupplierNumber.Replace("SUPP-", "");
            if (int.TryParse(lastNum, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"SUPP-{sequence:D6}";
    }
}
