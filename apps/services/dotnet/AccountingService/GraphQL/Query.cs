using AccountingService.Models;
using AccountingService.Services;
using AccountingService.DTOs;

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
        int skip,
        int take,
        [Service] IAccountService accountService)
    {
        return await accountService.GetAllAsync(skip, take);
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
        int skip,
        int take,
        [Service] IInvoiceService invoiceService)
    {
        return await invoiceService.GetAllAsync(skip, take);
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
        int skip,
        int take,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.GetAllAsync(skip, take);
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
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get a payment record by number")]
    public async Task<PaymentRecord?> GetPaymentRecordByNumber(
        string paymentNumber,
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.GetByNumberAsync(paymentNumber);
    }

    [GraphQLDescription("Get all payment records with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<PaymentRecord>> GetPaymentRecords(
        int skip,
        int take,
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Get payments by invoice")]
    public async Task<IEnumerable<PaymentRecord>> GetPaymentsByInvoice(
        Guid invoiceId,
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.GetByInvoiceAsync(invoiceId);
    }

    // Bank Account Queries
    [GraphQLDescription("Get a bank account by ID")]
    public async Task<BankAccount?> GetBankAccount(
        Guid id,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all bank accounts with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<BankAccount>> GetBankAccounts(
        int skip,
        int take,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Get active bank accounts")]
    public async Task<IEnumerable<BankAccount>> GetActiveBankAccounts(
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.GetActiveAsync();
    }

    [GraphQLDescription("Get bank account transactions")]
    public async Task<IEnumerable<BankTransaction>> GetBankTransactions(
        Guid bankAccountId,
        int skip,
        int take,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.GetTransactionsAsync(bankAccountId, skip, take);
    }

    // Reporting Queries
    [GraphQLDescription("Get balance sheet as of a specific date")]
    public async Task<BalanceSheetDto> GetBalanceSheet(
        DateTime asOfDate,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetBalanceSheetAsync(asOfDate);
    }

    [GraphQLDescription("Get income statement for a date range")]
    public async Task<IncomeStatementDto> GetIncomeStatement(
        DateTime from,
        DateTime to,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetIncomeStatementAsync(from, to);
    }

    [GraphQLDescription("Get trial balance as of a specific date")]
    public async Task<TrialBalanceDto> GetTrialBalance(
        DateTime asOfDate,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetTrialBalanceAsync(asOfDate);
    }

    [GraphQLDescription("Get cash flow statement for a date range")]
    public async Task<CashFlowStatementDto> GetCashFlowStatement(
        DateTime from,
        DateTime to,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetCashFlowStatementAsync(from, to);
    }

    [GraphQLDescription("Get account statement for a date range")]
    public async Task<AccountStatementDto> GetAccountStatement(
        Guid accountId,
        DateTime from,
        DateTime to,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetAccountStatementAsync(accountId, from, to);
    }

    [GraphQLDescription("Get accounts receivable aging report")]
    public async Task<AgingReportDto> GetReceivablesAging(
        DateTime asOfDate,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetReceivablesAgingAsync(asOfDate);
    }

    [GraphQLDescription("Get accounts payable aging report")]
    public async Task<AgingReportDto> GetPayablesAging(
        DateTime asOfDate,
        [Service] IReportingService reportingService)
    {
        return await reportingService.GetPayablesAgingAsync(asOfDate);
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
