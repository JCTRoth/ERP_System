using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IAccountService
{
    Task<Account?> GetByIdAsync(Guid id);
    Task<Account?> GetByCodeAsync(string accountCode);
    Task<IEnumerable<Account>> GetAllAsync(int skip = 0, int take = 100);
    Task<IEnumerable<Account>> GetByTypeAsync(AccountType type);
    Task<IEnumerable<Account>> GetChartOfAccountsAsync();
    Task<Account> CreateAsync(CreateAccountInput input);
    Task<Account?> UpdateAsync(Guid id, UpdateAccountInput input);
    Task<bool> UpdateBalanceAsync(Guid id, decimal amount);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<Account>> GetChildAccountsAsync(Guid parentId);
}

public class AccountService : IAccountService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<AccountService> _logger;

    public AccountService(AccountingDbContext context, ILogger<AccountService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Account?> GetByIdAsync(Guid id)
    {
        return await _context.Accounts
            .Include(a => a.ChildAccounts)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<Account?> GetByCodeAsync(string accountCode)
    {
        return await _context.Accounts
            .FirstOrDefaultAsync(a => a.AccountCode == accountCode);
    }

    public async Task<IEnumerable<Account>> GetAllAsync(int skip = 0, int take = 100)
    {
        return await _context.Accounts
            .OrderBy(a => a.AccountCode)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Account>> GetByTypeAsync(AccountType type)
    {
        return await _context.Accounts
            .Where(a => a.Type == type)
            .OrderBy(a => a.AccountCode)
            .ToListAsync();
    }

    public async Task<IEnumerable<Account>> GetChartOfAccountsAsync()
    {
        // Return hierarchical chart of accounts
        return await _context.Accounts
            .Where(a => a.ParentAccountId == null)
            .Include(a => a.ChildAccounts)
            .OrderBy(a => a.AccountCode)
            .ToListAsync();
    }

    public async Task<Account> CreateAsync(CreateAccountInput input)
    {
        // Validate unique account code
        var existingCode = await _context.Accounts
            .AnyAsync(a => a.AccountCode == input.AccountCode);

        if (existingCode)
        {
            throw new InvalidOperationException($"Account code {input.AccountCode} already exists");
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            AccountCode = input.AccountCode,
            Name = input.Name,
            Description = input.Description,
            Type = Enum.Parse<AccountType>(input.Type),
            Category = Enum.Parse<AccountCategory>(input.Category),
            ParentAccountId = input.ParentAccountId,
            IsActive = true,
            IsSystemAccount = false,
            Balance = 0,
            Currency = input.Currency ?? "USD",
            CreatedAt = DateTime.UtcNow
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Account created: {AccountCode} - {Name}",
            account.AccountCode, account.Name);

        return account;
    }

    public async Task<Account?> UpdateAsync(Guid id, UpdateAccountInput input)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return null;

        if (account.IsSystemAccount)
        {
            _logger.LogWarning("Cannot modify system account: {AccountCode}", account.AccountCode);
            throw new InvalidOperationException("System accounts cannot be modified");
        }

        if (!string.IsNullOrEmpty(input.Name))
            account.Name = input.Name;

        if (!string.IsNullOrEmpty(input.Description))
            account.Description = input.Description;

        if (input.IsActive.HasValue)
            account.IsActive = input.IsActive.Value;

        if (input.ParentAccountId.HasValue)
            account.ParentAccountId = input.ParentAccountId;

        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Account updated: {AccountCode}", account.AccountCode);

        return account;
    }

    public async Task<bool> UpdateBalanceAsync(Guid id, decimal amount)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return false;

        // Debits increase Asset/Expense accounts, decrease Liability/Equity/Revenue
        // Credits decrease Asset/Expense accounts, increase Liability/Equity/Revenue
        if (account.Type == AccountType.Asset || account.Type == AccountType.Expense)
        {
            account.Balance += amount;  // amount is debit - credit
        }
        else
        {
            account.Balance -= amount;  // Reverse for liability/equity/revenue
        }

        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return false;

        if (account.IsSystemAccount)
        {
            _logger.LogWarning("Cannot delete system account: {AccountCode}", account.AccountCode);
            return false;
        }

        // Check for journal entries
        var hasEntries = await _context.JournalEntryLines
            .AnyAsync(l => l.AccountId == id);

        if (hasEntries)
        {
            _logger.LogWarning("Cannot delete account with journal entries: {AccountCode}",
                account.AccountCode);
            return false;
        }

        // Check for child accounts
        var hasChildren = await _context.Accounts
            .AnyAsync(a => a.ParentAccountId == id);

        if (hasChildren)
        {
            _logger.LogWarning("Cannot delete account with child accounts: {AccountCode}",
                account.AccountCode);
            return false;
        }

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Account deleted: {AccountCode}", account.AccountCode);

        return true;
    }

    public async Task<IEnumerable<Account>> GetChildAccountsAsync(Guid parentId)
    {
        return await _context.Accounts
            .Where(a => a.ParentAccountId == parentId)
            .OrderBy(a => a.AccountCode)
            .ToListAsync();
    }
}
