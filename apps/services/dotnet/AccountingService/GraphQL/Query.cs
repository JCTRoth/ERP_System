using AccountingService.Models;
using AccountingService.Services;
using AccountingService.DTOs;
using AccountingService.Data;
using Microsoft.EntityFrameworkCore;

namespace AccountingService.GraphQL;

public class Query
{
    // Account Queries
    [GraphQLDescription("Get an account by ID")]
    public async Task<Account?> GetAccount(
        Guid id,
        [Service] IAccountService accountService)
    {
        return await accountService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an account by account code")]
    public async Task<Account?> GetAccountByCode(
        string accountCode,
        [Service] IAccountService accountService)
    {
        return await accountService.GetByCodeAsync(accountCode);
    }

    [GraphQLDescription("Get all accounts with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Account>> GetAccounts(
        [Service] IAccountService accountService)
    {
        return await accountService.GetAllAsync();
    }

    [GraphQLDescription("Get accounts by type")]
    public async Task<IEnumerable<Account>> GetAccountsByType(
        Models.AccountType type,
        [Service] IAccountService accountService)
    {
        return await accountService.GetByTypeAsync(type);
    }

    [GraphQLDescription("Get chart of accounts (hierarchical)")]
    public async Task<IEnumerable<Account>> GetChartOfAccounts(
        [Service] IAccountService accountService)
    {
        return await accountService.GetChartOfAccountsAsync();
    }

    // Invoice Queries
    [GraphQLDescription("Get an invoice by ID")]
    public async Task<Invoice?> GetInvoice(
        Guid id,
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an invoice by number")]
    public async Task<Invoice?> GetInvoiceByNumber(
        string invoiceNumber,
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetByNumberAsync(invoiceNumber);
    }

    [GraphQLDescription("Get all invoices with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Invoice>> GetInvoices(
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetAllAsync();
    }

    [GraphQLDescription("Get invoices by customer")]
    public async Task<IEnumerable<Invoice>> GetInvoicesByCustomer(
        Guid customerId,
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetByCustomerAsync(customerId);
    }

    [GraphQLDescription("Get invoices by status")]
    public async Task<IEnumerable<Invoice>> GetInvoicesByStatus(
        InvoiceStatus status,
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetByStatusAsync(status);
    }

    [GraphQLDescription("Get overdue invoices")]
    public async Task<IEnumerable<Invoice>> GetOverdueInvoices(
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetOverdueAsync();
    }

    // Journal Entry Queries
    [GraphQLDescription("Get a journal entry by ID")]
    public async Task<JournalEntry?> GetJournalEntry(
        Guid id,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get a journal entry by entry number")]
    public async Task<JournalEntry?> GetJournalEntryByNumber(
        string entryNumber,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.GetByNumberAsync(entryNumber);
    }

    [GraphQLDescription("Get all journal entries with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<JournalEntry>> GetJournalEntries(
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.GetAllAsync();
    }

    [GraphQLDescription("Get journal entries by date range")]
    public async Task<IEnumerable<JournalEntry>> GetJournalEntriesByDateRange(
        DateTime from,
        DateTime to,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.GetByDateRangeAsync(from, to);
    }

    // Payment Record Queries
    [GraphQLDescription("Get a payment record by ID")]
    public async Task<PaymentRecord?> GetPaymentRecord(
        Guid id,
        [Service] AccountingDbContext context)
    {
        return await context.PaymentRecords
            .Include(p => p.Invoice)
            .Include(p => p.BankAccount)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    [GraphQLDescription("Get all payment records with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IQueryable<PaymentRecord>> GetPaymentRecords(
        [Service] AccountingDbContext context)
    {
        return context.PaymentRecords
            .Include(p => p.Invoice)
            .Include(p => p.BankAccount);
    }

    // Bank Account Queries
    [GraphQLDescription("Get a bank account by ID")]
    public async Task<BankAccount?> GetBankAccount(
        Guid id,
        [Service] AccountingDbContext context)
    {
        return await context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    [GraphQLDescription("Get all bank accounts with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IQueryable<BankAccount>> GetBankAccounts(
        [Service] AccountingDbContext context)
    {
        return context.BankAccounts;
    }

    // Reporting Queries
    [GraphQLDescription("Get balance sheet as of a specific date")]
    public async Task<BalanceSheet> GetBalanceSheet(
        DateTime asOfDate,
        [Service] AccountingDbContext context)
    {
        // Get accounts with balances
        var accounts = await context.Accounts
            .Where(a => a.IsActive)
            .ToListAsync();

        var currentAssetCategories = new[] { AccountCategory.Cash, AccountCategory.BankAccount, AccountCategory.AccountsReceivable, AccountCategory.Inventory };
        var currentAssets = accounts
            .Where(a => a.Type == Models.AccountType.Asset && currentAssetCategories.Contains(a.Category))
            .Select(a => new BalanceSheetLine
            {
                AccountId = a.Id,
                AccountNumber = a.AccountNumber,
                AccountName = a.Name,
                Category = a.Category.ToString(),
                IsSystemAccount = a.IsSystemAccount,
                Balance = a.Balance
            })
            .ToList();

        var nonCurrentAssets = accounts
            .Where(a => a.Type == Models.AccountType.Asset && !currentAssetCategories.Contains(a.Category))
            .Select(a => new BalanceSheetLine
            {
                AccountId = a.Id,
                AccountNumber = a.AccountNumber,
                AccountName = a.Name,
                Category = a.Category.ToString(),
                IsSystemAccount = a.IsSystemAccount,
                Balance = a.Balance
            })
            .ToList();

        var currentLiabilityCategories = new[] { AccountCategory.AccountsPayable, AccountCategory.ShortTermDebt, AccountCategory.TaxLiabilities };
        var currentLiabilities = accounts
            .Where(a => a.Type == Models.AccountType.Liability && currentLiabilityCategories.Contains(a.Category))
            .Select(a => new BalanceSheetLine
            {
                AccountId = a.Id,
                AccountNumber = a.AccountNumber,
                AccountName = a.Name,
                Category = a.Category.ToString(),
                IsSystemAccount = a.IsSystemAccount,
                Balance = a.Balance
            })
            .ToList();

        var nonCurrentLiabilities = accounts
            .Where(a => a.Type == Models.AccountType.Liability && !currentLiabilityCategories.Contains(a.Category))
            .Select(a => new BalanceSheetLine
            {
                AccountId = a.Id,
                AccountNumber = a.AccountNumber,
                AccountName = a.Name,
                Category = a.Category.ToString(),
                IsSystemAccount = a.IsSystemAccount,
                Balance = a.Balance
            })
            .ToList();

        var equityAccounts = accounts
            .Where(a => a.Type == Models.AccountType.Equity)
            .Select(a => new BalanceSheetLine
            {
                AccountId = a.Id,
                AccountNumber = a.AccountNumber,
                AccountName = a.Name,
                Category = a.Category.ToString(),
                IsSystemAccount = a.IsSystemAccount,
                Balance = a.Balance
            })
            .ToList();

        return new BalanceSheet
        {
            AsOfDate = asOfDate,
            Assets = new AssetsSection
            {
                Current = currentAssets,
                NonCurrent = nonCurrentAssets,
                TotalCurrent = currentAssets.Sum(a => a.Balance),
                TotalNonCurrent = nonCurrentAssets.Sum(a => a.Balance),
                Total = currentAssets.Sum(a => a.Balance) + nonCurrentAssets.Sum(a => a.Balance)
            },
            Liabilities = new LiabilitiesSection
            {
                Current = currentLiabilities,
                NonCurrent = nonCurrentLiabilities,
                TotalCurrent = currentLiabilities.Sum(l => l.Balance),
                TotalNonCurrent = nonCurrentLiabilities.Sum(l => l.Balance),
                Total = currentLiabilities.Sum(l => l.Balance) + nonCurrentLiabilities.Sum(l => l.Balance)
            },
            Equity = new EquitySection
            {
                Items = equityAccounts,
                RetainedEarnings = equityAccounts.FirstOrDefault(e => e.AccountName.Contains("Retained"))?.Balance ?? 0,
                Total = equityAccounts.Sum(e => e.Balance)
            },
            TotalLiabilitiesAndEquity = currentLiabilities.Sum(l => l.Balance) + nonCurrentLiabilities.Sum(l => l.Balance) + equityAccounts.Sum(e => e.Balance)
        };
    }

    // Tax Rate Queries
    [GraphQLDescription("Get all tax rates")]
    public async Task<IEnumerable<TaxRate>> GetTaxRates(
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        return await context.TaxRates
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    // Fiscal Period Queries
    [GraphQLDescription("Get all fiscal periods")]
    public async Task<IEnumerable<FiscalPeriod>> GetFiscalPeriods(
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        return await context.FiscalPeriods
            .OrderByDescending(f => f.StartDate)
            .ToListAsync();
    }

    [GraphQLDescription("Get current fiscal period")]
    public async Task<FiscalPeriod?> GetCurrentFiscalPeriod(
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        var today = DateTime.UtcNow;
        return await context.FiscalPeriods
            .FirstOrDefaultAsync(f => f.StartDate <= today && f.EndDate >= today);
    }
}
