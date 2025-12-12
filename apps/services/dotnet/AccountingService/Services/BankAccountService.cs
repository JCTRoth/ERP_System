using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IBankAccountService
{
    Task<BankAccount?> GetByIdAsync(Guid id);
    Task<IEnumerable<BankAccount>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<BankAccount>> GetActiveAsync();
    Task<BankAccount> CreateAsync(CreateBankAccountInput input);
    Task<BankAccount?> UpdateAsync(Guid id, UpdateBankAccountInput input);
    Task<bool> DeactivateAsync(Guid id);
    Task<IEnumerable<BankTransaction>> GetTransactionsAsync(Guid bankAccountId, int skip = 0, int take = 50);
    Task<BankTransaction> RecordTransactionAsync(CreateBankTransactionInput input);
    Task<BankReconciliation?> ReconcileAsync(Guid bankAccountId, CreateReconciliationInput input);
}

public class BankAccountService : IBankAccountService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<BankAccountService> _logger;

    public BankAccountService(AccountingDbContext context, ILogger<BankAccountService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BankAccount?> GetByIdAsync(Guid id)
    {
        return await _context.BankAccounts
            .Include(b => b.GlAccount)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<IEnumerable<BankAccount>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.BankAccounts
            .Include(b => b.GlAccount)
            .OrderBy(b => b.AccountName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<BankAccount>> GetActiveAsync()
    {
        return await _context.BankAccounts
            .Where(b => b.IsActive)
            .Include(b => b.GlAccount)
            .OrderBy(b => b.AccountName)
            .ToListAsync();
    }

    public async Task<BankAccount> CreateAsync(CreateBankAccountInput input)
    {
        var bankAccount = new BankAccount
        {
            Id = Guid.NewGuid(),
            AccountName = input.AccountName,
            BankName = input.BankName,
            AccountNumber = input.AccountNumber,
            RoutingNumber = input.RoutingNumber,
            Iban = input.Iban,
            SwiftCode = input.SwiftCode,
            Currency = input.Currency ?? "USD",
            CurrentBalance = input.OpeningBalance ?? 0,
            AvailableBalance = input.OpeningBalance ?? 0,
            GlAccountId = input.GlAccountId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.BankAccounts.Add(bankAccount);

        // Record opening balance transaction if any
        if (input.OpeningBalance.HasValue && input.OpeningBalance.Value != 0)
        {
            var transaction = new BankTransaction
            {
                Id = Guid.NewGuid(),
                BankAccountId = bankAccount.Id,
                TransactionDate = DateTime.UtcNow,
                Type = input.OpeningBalance > 0
                    ? BankTransactionType.Deposit
                    : BankTransactionType.Withdrawal,
                Amount = Math.Abs(input.OpeningBalance.Value),
                Description = "Opening Balance",
                Reference = "OPENING",
                RunningBalance = input.OpeningBalance.Value,
                IsReconciled = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.BankTransactions.Add(transaction);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank account created: {AccountName} at {BankName}",
            bankAccount.AccountName, bankAccount.BankName);

        return bankAccount;
    }

    public async Task<BankAccount?> UpdateAsync(Guid id, UpdateBankAccountInput input)
    {
        var bankAccount = await _context.BankAccounts.FindAsync(id);
        if (bankAccount == null) return null;

        if (!string.IsNullOrEmpty(input.AccountName))
            bankAccount.AccountName = input.AccountName;

        if (!string.IsNullOrEmpty(input.BankName))
            bankAccount.BankName = input.BankName;

        if (!string.IsNullOrEmpty(input.AccountNumber))
            bankAccount.AccountNumber = input.AccountNumber;

        if (!string.IsNullOrEmpty(input.RoutingNumber))
            bankAccount.RoutingNumber = input.RoutingNumber;

        if (!string.IsNullOrEmpty(input.Iban))
            bankAccount.Iban = input.Iban;

        if (!string.IsNullOrEmpty(input.SwiftCode))
            bankAccount.SwiftCode = input.SwiftCode;

        if (input.GlAccountId.HasValue)
            bankAccount.GlAccountId = input.GlAccountId.Value;

        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank account updated: {AccountName}", bankAccount.AccountName);

        return bankAccount;
    }

    public async Task<bool> DeactivateAsync(Guid id)
    {
        var bankAccount = await _context.BankAccounts.FindAsync(id);
        if (bankAccount == null) return false;

        bankAccount.IsActive = false;
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank account deactivated: {AccountName}", bankAccount.AccountName);

        return true;
    }

    public async Task<IEnumerable<BankTransaction>> GetTransactionsAsync(
        Guid bankAccountId, int skip = 0, int take = 50)
    {
        return await _context.BankTransactions
            .Where(t => t.BankAccountId == bankAccountId)
            .OrderByDescending(t => t.TransactionDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<BankTransaction> RecordTransactionAsync(CreateBankTransactionInput input)
    {
        var bankAccount = await _context.BankAccounts.FindAsync(input.BankAccountId);
        if (bankAccount == null)
        {
            throw new InvalidOperationException($"Bank account {input.BankAccountId} not found");
        }

        var transactionType = Enum.Parse<BankTransactionType>(input.Type);
        var amount = input.Amount;

        // Update bank account balance
        if (transactionType == BankTransactionType.Deposit ||
            transactionType == BankTransactionType.InterestCredit)
        {
            bankAccount.CurrentBalance += amount;
            bankAccount.AvailableBalance += amount;
        }
        else if (transactionType == BankTransactionType.Withdrawal ||
                 transactionType == BankTransactionType.Fee ||
                 transactionType == BankTransactionType.Check)
        {
            bankAccount.CurrentBalance -= amount;
            bankAccount.AvailableBalance -= amount;
        }
        else if (transactionType == BankTransactionType.Transfer)
        {
            // Transfer can be in or out based on signed amount
            bankAccount.CurrentBalance += input.Amount;
            bankAccount.AvailableBalance += input.Amount;
        }

        var transaction = new BankTransaction
        {
            Id = Guid.NewGuid(),
            BankAccountId = input.BankAccountId,
            TransactionDate = input.TransactionDate ?? DateTime.UtcNow,
            Type = transactionType,
            Amount = amount,
            Description = input.Description,
            Reference = input.Reference,
            CheckNumber = input.CheckNumber,
            PaymentRecordId = input.PaymentRecordId,
            RunningBalance = bankAccount.CurrentBalance,
            IsReconciled = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.BankTransactions.Add(transaction);
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank transaction recorded: {Type} {Amount} for account {AccountName}",
            transactionType, amount, bankAccount.AccountName);

        return transaction;
    }

    public async Task<BankReconciliation?> ReconcileAsync(Guid bankAccountId, CreateReconciliationInput input)
    {
        var bankAccount = await _context.BankAccounts.FindAsync(bankAccountId);
        if (bankAccount == null) return null;

        // Mark transactions as reconciled
        var transactions = await _context.BankTransactions
            .Where(t => input.TransactionIds.Contains(t.Id))
            .ToListAsync();

        foreach (var transaction in transactions)
        {
            transaction.IsReconciled = true;
            transaction.ReconciledDate = DateTime.UtcNow;
        }

        var reconciliation = new BankReconciliation
        {
            Id = Guid.NewGuid(),
            BankAccountId = bankAccountId,
            StatementDate = input.StatementDate,
            StatementEndingBalance = input.StatementEndingBalance,
            BookBalance = bankAccount.CurrentBalance,
            Difference = input.StatementEndingBalance - bankAccount.CurrentBalance,
            Status = Math.Abs(input.StatementEndingBalance - bankAccount.CurrentBalance) < 0.01m
                ? ReconciliationStatus.Reconciled
                : ReconciliationStatus.UnreconciledDifference,
            Notes = input.Notes,
            ReconciledBy = input.ReconciledBy,
            ReconciledAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.BankReconciliations.Add(reconciliation);

        bankAccount.LastReconciledDate = DateTime.UtcNow;
        bankAccount.LastReconciledBalance = input.StatementEndingBalance;
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank account {AccountName} reconciled: Status {Status}",
            bankAccount.AccountName, reconciliation.Status);

        return reconciliation;
    }
}
