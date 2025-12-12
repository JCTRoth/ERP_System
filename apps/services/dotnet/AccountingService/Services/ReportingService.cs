using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IReportingService
{
    Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime asOfDate);
    Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime from, DateTime to);
    Task<TrialBalanceDto> GetTrialBalanceAsync(DateTime asOfDate);
    Task<CashFlowStatementDto> GetCashFlowStatementAsync(DateTime from, DateTime to);
    Task<AccountStatementDto> GetAccountStatementAsync(Guid accountId, DateTime from, DateTime to);
    Task<AgingReportDto> GetReceivablesAgingAsync(DateTime asOfDate);
    Task<AgingReportDto> GetPayablesAgingAsync(DateTime asOfDate);
}

public class ReportingService : IReportingService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<ReportingService> _logger;

    public ReportingService(AccountingDbContext context, ILogger<ReportingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime asOfDate)
    {
        var accounts = await _context.Accounts
            .Where(a => a.IsActive)
            .ToListAsync();

        // Calculate balances as of the given date
        var journalLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate <= asOfDate)
            .ToListAsync();

        var accountBalances = journalLines
            .GroupBy(l => l.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(l => l.DebitAmount - l.CreditAmount)
            );

        // Group assets
        var assets = accounts
            .Where(a => a.Type == AccountType.Asset)
            .Select(a => new BalanceSheetLineDto(
                a.AccountCode,
                a.Name,
                accountBalances.GetValueOrDefault(a.Id, 0)
            ))
            .Where(l => l.Balance != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var currentAssets = assets
            .Where(a => a.AccountCode.StartsWith("1"))
            .ToList();

        var fixedAssets = assets
            .Where(a => a.AccountCode.StartsWith("15") || a.AccountCode.StartsWith("16"))
            .ToList();

        // Group liabilities
        var liabilities = accounts
            .Where(a => a.Type == AccountType.Liability)
            .Select(a => new BalanceSheetLineDto(
                a.AccountCode,
                a.Name,
                -accountBalances.GetValueOrDefault(a.Id, 0) // Liabilities have credit balances
            ))
            .Where(l => l.Balance != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var currentLiabilities = liabilities
            .Where(l => l.AccountCode.StartsWith("2"))
            .ToList();

        var longTermLiabilities = liabilities
            .Where(l => l.AccountCode.StartsWith("25") || l.AccountCode.StartsWith("26"))
            .ToList();

        // Group equity
        var equity = accounts
            .Where(a => a.Type == AccountType.Equity)
            .Select(a => new BalanceSheetLineDto(
                a.AccountCode,
                a.Name,
                -accountBalances.GetValueOrDefault(a.Id, 0)
            ))
            .Where(l => l.Balance != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        // Calculate retained earnings (net income from revenue - expenses)
        var revenueTotal = accounts
            .Where(a => a.Type == AccountType.Revenue)
            .Sum(a => -accountBalances.GetValueOrDefault(a.Id, 0));

        var expenseTotal = accounts
            .Where(a => a.Type == AccountType.Expense)
            .Sum(a => accountBalances.GetValueOrDefault(a.Id, 0));

        var netIncome = revenueTotal - expenseTotal;

        // Add retained earnings to equity
        equity.Add(new BalanceSheetLineDto("3100", "Retained Earnings (Current Period)", netIncome));

        var totalAssets = currentAssets.Sum(a => a.Balance) + fixedAssets.Sum(a => a.Balance);
        var totalLiabilities = currentLiabilities.Sum(l => l.Balance) + longTermLiabilities.Sum(l => l.Balance);
        var totalEquity = equity.Sum(e => e.Balance);

        return new BalanceSheetDto(
            asOfDate,
            currentAssets,
            fixedAssets,
            currentAssets.Sum(a => a.Balance),
            fixedAssets.Sum(a => a.Balance),
            totalAssets,
            currentLiabilities,
            longTermLiabilities,
            currentLiabilities.Sum(l => l.Balance),
            longTermLiabilities.Sum(l => l.Balance),
            totalLiabilities,
            equity,
            totalEquity,
            totalLiabilities + totalEquity
        );
    }

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime from, DateTime to)
    {
        var accounts = await _context.Accounts
            .Where(a => a.IsActive &&
                       (a.Type == AccountType.Revenue || a.Type == AccountType.Expense))
            .ToListAsync();

        var journalLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate >= from &&
                       l.JournalEntry.EntryDate <= to)
            .ToListAsync();

        var accountBalances = journalLines
            .GroupBy(l => l.AccountId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(l => l.CreditAmount - l.DebitAmount) // Revenue is credit, expense is debit
            );

        var revenueLines = accounts
            .Where(a => a.Type == AccountType.Revenue)
            .Select(a => new IncomeStatementLineDto(
                a.AccountCode,
                a.Name,
                accountBalances.GetValueOrDefault(a.Id, 0)
            ))
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var expenseLines = accounts
            .Where(a => a.Type == AccountType.Expense)
            .Select(a => new IncomeStatementLineDto(
                a.AccountCode,
                a.Name,
                -accountBalances.GetValueOrDefault(a.Id, 0) // Expenses are debits
            ))
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var costOfGoodsSold = expenseLines
            .Where(e => e.AccountCode.StartsWith("50"))
            .ToList();

        var operatingExpenses = expenseLines
            .Where(e => e.AccountCode.StartsWith("6"))
            .ToList();

        var otherExpenses = expenseLines
            .Where(e => !e.AccountCode.StartsWith("50") && !e.AccountCode.StartsWith("6"))
            .ToList();

        var totalRevenue = revenueLines.Sum(r => r.Amount);
        var totalCogs = costOfGoodsSold.Sum(c => c.Amount);
        var grossProfit = totalRevenue - totalCogs;
        var totalOperatingExpenses = operatingExpenses.Sum(e => e.Amount);
        var operatingIncome = grossProfit - totalOperatingExpenses;
        var totalOtherExpenses = otherExpenses.Sum(e => e.Amount);
        var netIncome = operatingIncome - totalOtherExpenses;

        return new IncomeStatementDto(
            from,
            to,
            revenueLines,
            totalRevenue,
            costOfGoodsSold,
            totalCogs,
            grossProfit,
            operatingExpenses,
            totalOperatingExpenses,
            operatingIncome,
            otherExpenses,
            totalOtherExpenses,
            netIncome
        );
    }

    public async Task<TrialBalanceDto> GetTrialBalanceAsync(DateTime asOfDate)
    {
        var accounts = await _context.Accounts
            .Where(a => a.IsActive)
            .OrderBy(a => a.AccountCode)
            .ToListAsync();

        var journalLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate <= asOfDate)
            .ToListAsync();

        var accountTotals = journalLines
            .GroupBy(l => l.AccountId)
            .ToDictionary(
                g => g.Key,
                g => new { Debit = g.Sum(l => l.DebitAmount), Credit = g.Sum(l => l.CreditAmount) }
            );

        var lines = new List<TrialBalanceLineDto>();

        foreach (var account in accounts)
        {
            var totals = accountTotals.GetValueOrDefault(account.Id);
            var debit = totals?.Debit ?? 0;
            var credit = totals?.Credit ?? 0;
            var balance = debit - credit;

            // Only include accounts with activity
            if (debit != 0 || credit != 0)
            {
                // Determine natural balance based on account type
                decimal debitBalance = 0, creditBalance = 0;

                if (account.Type == AccountType.Asset || account.Type == AccountType.Expense)
                {
                    debitBalance = balance > 0 ? balance : 0;
                    creditBalance = balance < 0 ? -balance : 0;
                }
                else
                {
                    debitBalance = balance > 0 ? balance : 0;
                    creditBalance = balance < 0 ? -balance : 0;
                    // Swap for liability/equity/revenue accounts
                    (debitBalance, creditBalance) = (creditBalance, debitBalance);
                }

                lines.Add(new TrialBalanceLineDto(
                    account.AccountCode,
                    account.Name,
                    debitBalance,
                    creditBalance
                ));
            }
        }

        var totalDebit = lines.Sum(l => l.Debit);
        var totalCredit = lines.Sum(l => l.Credit);

        return new TrialBalanceDto(
            asOfDate,
            lines,
            totalDebit,
            totalCredit,
            Math.Abs(totalDebit - totalCredit) < 0.01m
        );
    }

    public async Task<CashFlowStatementDto> GetCashFlowStatementAsync(DateTime from, DateTime to)
    {
        var cashAccounts = await _context.Accounts
            .Where(a => a.AccountCode.StartsWith("10"))
            .Select(a => a.Id)
            .ToListAsync();

        var journalLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Include(l => l.Account)
            .Where(l => l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate >= from &&
                       l.JournalEntry.EntryDate <= to &&
                       cashAccounts.Contains(l.AccountId))
            .ToListAsync();

        // Calculate beginning cash
        var beginningCashLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate < from &&
                       cashAccounts.Contains(l.AccountId))
            .ToListAsync();

        var beginningCash = beginningCashLines.Sum(l => l.DebitAmount - l.CreditAmount);

        // Group cash flows by type (simplified classification)
        var operatingActivities = new List<CashFlowLineDto>();
        var investingActivities = new List<CashFlowLineDto>();
        var financingActivities = new List<CashFlowLineDto>();

        // Group by journal entry type
        var groupedByEntry = journalLines
            .GroupBy(l => l.JournalEntryId)
            .ToList();

        foreach (var group in groupedByEntry)
        {
            var entry = group.First().JournalEntry;
            var netCash = group.Sum(l => l.DebitAmount - l.CreditAmount);

            var line = new CashFlowLineDto(entry.Description ?? "Unspecified", netCash);

            // Classify based on entry type or description
            if (entry.Type == JournalEntryType.Payment ||
                entry.Type == JournalEntryType.Sales ||
                entry.Description?.Contains("Operating") == true)
            {
                operatingActivities.Add(line);
            }
            else if (entry.Description?.Contains("Investment") == true ||
                     entry.Description?.Contains("Asset") == true)
            {
                investingActivities.Add(line);
            }
            else if (entry.Description?.Contains("Loan") == true ||
                     entry.Description?.Contains("Capital") == true ||
                     entry.Description?.Contains("Dividend") == true)
            {
                financingActivities.Add(line);
            }
            else
            {
                operatingActivities.Add(line);
            }
        }

        var totalOperating = operatingActivities.Sum(a => a.Amount);
        var totalInvesting = investingActivities.Sum(a => a.Amount);
        var totalFinancing = financingActivities.Sum(a => a.Amount);
        var netChange = totalOperating + totalInvesting + totalFinancing;
        var endingCash = beginningCash + netChange;

        return new CashFlowStatementDto(
            from,
            to,
            operatingActivities,
            totalOperating,
            investingActivities,
            totalInvesting,
            financingActivities,
            totalFinancing,
            netChange,
            beginningCash,
            endingCash
        );
    }

    public async Task<AccountStatementDto> GetAccountStatementAsync(
        Guid accountId, DateTime from, DateTime to)
    {
        var account = await _context.Accounts.FindAsync(accountId);
        if (account == null)
        {
            throw new InvalidOperationException($"Account {accountId} not found");
        }

        // Get beginning balance
        var beginningLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId &&
                       l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate < from)
            .ToListAsync();

        var beginningBalance = beginningLines.Sum(l => l.DebitAmount - l.CreditAmount);

        // Get transactions in period
        var lines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId &&
                       l.JournalEntry.Status == JournalEntryStatus.Posted &&
                       l.JournalEntry.EntryDate >= from &&
                       l.JournalEntry.EntryDate <= to)
            .OrderBy(l => l.JournalEntry.EntryDate)
            .ToListAsync();

        var transactions = new List<AccountTransactionDto>();
        var runningBalance = beginningBalance;

        foreach (var line in lines)
        {
            var netAmount = line.DebitAmount - line.CreditAmount;
            runningBalance += netAmount;

            transactions.Add(new AccountTransactionDto(
                line.JournalEntry.EntryDate,
                line.JournalEntry.EntryNumber,
                line.Description ?? line.JournalEntry.Description ?? "",
                line.DebitAmount,
                line.CreditAmount,
                runningBalance
            ));
        }

        var totalDebit = lines.Sum(l => l.DebitAmount);
        var totalCredit = lines.Sum(l => l.CreditAmount);

        return new AccountStatementDto(
            accountId,
            account.AccountCode,
            account.Name,
            from,
            to,
            beginningBalance,
            transactions,
            totalDebit,
            totalCredit,
            runningBalance
        );
    }

    public async Task<AgingReportDto> GetReceivablesAgingAsync(DateTime asOfDate)
    {
        var invoices = await _context.Invoices
            .Where(i => i.Type == InvoiceType.SalesInvoice &&
                       i.Status != InvoiceStatus.Paid &&
                       i.Status != InvoiceStatus.Cancelled &&
                       i.Status != InvoiceStatus.Void)
            .ToListAsync();

        return CreateAgingReport(invoices, asOfDate, "Accounts Receivable Aging");
    }

    public async Task<AgingReportDto> GetPayablesAgingAsync(DateTime asOfDate)
    {
        var invoices = await _context.Invoices
            .Where(i => i.Type == InvoiceType.PurchaseInvoice &&
                       i.Status != InvoiceStatus.Paid &&
                       i.Status != InvoiceStatus.Cancelled &&
                       i.Status != InvoiceStatus.Void)
            .ToListAsync();

        return CreateAgingReport(invoices, asOfDate, "Accounts Payable Aging");
    }

    private AgingReportDto CreateAgingReport(List<Invoice> invoices, DateTime asOfDate, string reportName)
    {
        var buckets = new Dictionary<string, List<Invoice>>
        {
            { "Current", new List<Invoice>() },
            { "1-30 Days", new List<Invoice>() },
            { "31-60 Days", new List<Invoice>() },
            { "61-90 Days", new List<Invoice>() },
            { "Over 90 Days", new List<Invoice>() }
        };

        foreach (var invoice in invoices)
        {
            var dueDate = invoice.DueDate ?? invoice.InvoiceDate.AddDays(30);
            var daysOverdue = (asOfDate - dueDate).Days;
            var balance = invoice.TotalAmount - invoice.PaidAmount;

            if (daysOverdue <= 0)
                buckets["Current"].Add(invoice);
            else if (daysOverdue <= 30)
                buckets["1-30 Days"].Add(invoice);
            else if (daysOverdue <= 60)
                buckets["31-60 Days"].Add(invoice);
            else if (daysOverdue <= 90)
                buckets["61-90 Days"].Add(invoice);
            else
                buckets["Over 90 Days"].Add(invoice);
        }

        var agingBuckets = buckets.Select(b => new AgingBucketDto(
            b.Key,
            b.Value.Sum(i => i.TotalAmount - i.PaidAmount),
            b.Value.Count
        )).ToList();

        return new AgingReportDto(
            reportName,
            asOfDate,
            agingBuckets,
            agingBuckets.Sum(b => b.Amount),
            invoices.Count
        );
    }
}
