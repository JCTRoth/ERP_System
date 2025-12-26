using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.DTOs;
using MasterdataService.Models;

namespace MasterdataService.Services;

public interface ICustomerService
{
    Task<Customer?> GetByIdAsync(Guid id);
    Task<Customer?> GetByNumberAsync(string customerNumber);
    Task<IEnumerable<Customer>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Customer>> SearchAsync(string query);
    Task<Customer> CreateAsync(CreateCustomerInput input);
    Task<Customer?> UpdateAsync(Guid id, UpdateCustomerInput input);
    Task<bool> DeleteAsync(Guid id);
    Task<Address> AddAddressAsync(Guid customerId, CreateAddressInput input);
    Task<Contact> AddContactAsync(Guid customerId, CreateContactInput input);
    Task<BankDetail> AddBankDetailAsync(Guid customerId, CreateBankDetailInput input);
}

public class CustomerService : ICustomerService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(MasterdataDbContext context, ILogger<CustomerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Customer?> GetByIdAsync(Guid id)
    {
        return await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Customer?> GetByNumberAsync(string customerNumber)
    {
        return await _context.Customers
            .FirstOrDefaultAsync(c => c.CustomerNumber == customerNumber);
    }

    public async Task<IEnumerable<Customer>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Customers
            .OrderBy(c => c.Name)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Customer>> SearchAsync(string query)
    {
        return await _context.Customers
            .Where(c => c.Name.Contains(query) ||
                       c.CustomerNumber.Contains(query) ||
                       (c.Email != null && c.Email.Contains(query)))
            .OrderBy(c => c.Name)
            .Take(50)
            .ToListAsync();
    }

    public async Task<Customer> CreateAsync(CreateCustomerInput input)
    {
        var customerNumber = await GenerateCustomerNumberAsync();

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CustomerNumber = customerNumber,
            Name = input.Name,
            Type = Enum.Parse<CustomerType>(input.Type, true),
            ContactPerson = input.ContactPerson,
            Email = input.Email,
            Phone = input.Phone,
            Fax = input.Fax,
            Website = input.Website,
            TaxId = input.TaxId,
            DefaultCurrencyId = input.DefaultCurrencyId,
            DefaultPaymentTermId = input.DefaultPaymentTermId,
            CreditLimit = input.CreditLimit ?? 0,
            CurrentBalance = 0,
            Status = CustomerStatus.Active,
            Notes = input.Notes,
            CreatedAt = DateTime.UtcNow
        };

        // Add addresses
        if (input.Addresses != null)
        {
            foreach (var addr in input.Addresses)
            {
                customer.Addresses.Add(new Address
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
                customer.Contacts.Add(new Contact
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

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer created: {CustomerNumber} - {Name}",
            customerNumber, customer.Name);

        return customer;
    }

    public async Task<Customer?> UpdateAsync(Guid id, UpdateCustomerInput input)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            customer.Name = input.Name;

        if (!string.IsNullOrEmpty(input.Type))
            customer.Type = Enum.Parse<CustomerType>(input.Type);

        if (input.ContactPerson != null)
            customer.ContactPerson = input.ContactPerson;

        if (input.Email != null)
            customer.Email = input.Email;

        if (input.Phone != null)
            customer.Phone = input.Phone;

        if (input.Fax != null)
            customer.Fax = input.Fax;

        if (input.Website != null)
            customer.Website = input.Website;

        if (input.TaxId != null)
            customer.TaxId = input.TaxId;

        if (input.DefaultCurrencyId.HasValue)
            customer.DefaultCurrencyId = input.DefaultCurrencyId;

        if (input.DefaultPaymentTermId.HasValue)
            customer.DefaultPaymentTermId = input.DefaultPaymentTermId;

        if (input.CreditLimit.HasValue)
            customer.CreditLimit = input.CreditLimit.Value;

        if (!string.IsNullOrEmpty(input.Status))
            customer.Status = Enum.Parse<CustomerStatus>(input.Status);

        if (input.Notes != null)
            customer.Notes = input.Notes;

        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer updated: {CustomerNumber}", customer.CustomerNumber);

        return customer;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return false;

        // Soft delete - change status
        customer.Status = CustomerStatus.Inactive;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Customer deactivated: {CustomerNumber}", customer.CustomerNumber);

        return true;
    }

    public async Task<Address> AddAddressAsync(Guid customerId, CreateAddressInput input)
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
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
            // Clear other defaults
            await _context.Addresses
                .Where(a => a.CustomerId == customerId && a.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false));
        }

        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();

        return address;
    }

    public async Task<Contact> AddContactAsync(Guid customerId, CreateContactInput input)
    {
        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
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
                .Where(c => c.CustomerId == customerId && c.IsPrimary)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsPrimary, false));
        }

        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync();

        return contact;
    }

    public async Task<BankDetail> AddBankDetailAsync(Guid customerId, CreateBankDetailInput input)
    {
        var bankDetail = new BankDetail
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
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
                .Where(b => b.CustomerId == customerId && b.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsDefault, false));
        }

        _context.BankDetails.Add(bankDetail);
        await _context.SaveChangesAsync();

        return bankDetail;
    }

    private async Task<string> GenerateCustomerNumberAsync()
    {
        var lastCustomer = await _context.Customers
            .OrderByDescending(c => c.CustomerNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastCustomer != null)
        {
            var lastNum = lastCustomer.CustomerNumber.Replace("CUST-", "");
            if (int.TryParse(lastNum, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"CUST-{sequence:D6}";
    }
}
