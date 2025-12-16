using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IJournalEntryService
{
    Task<JournalEntry?> GetByIdAsync(Guid id);
    Task<JournalEntry?> GetByNumberAsync(string entryNumber);
    Task<IEnumerable<JournalEntry>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<JournalEntry>> GetByDateRangeAsync(DateTime from, DateTime to);
    Task<JournalEntry> CreateAsync(CreateJournalEntryInput input);
    Task<JournalEntry?> PostAsync(Guid id);
    Task<JournalEntry?> ReverseEntryAsync(Guid id, string? reason);
    Task<bool> VoidAsync(Guid id, string? reason);
}

public class JournalEntryService : IJournalEntryService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<JournalEntryService> _logger;
    //private readonly IAccountService _accountService;

    public JournalEntryService(
        AccountingDbContext context,
        ILogger<JournalEntryService> logger
        //IAccountService accountService
        )
    {
        _context = context;
        _logger = logger;
        //_accountService = accountService;
    }

    public async Task<JournalEntry?> GetByIdAsync(Guid id)
    {
        return await _context.JournalEntries
            .Include(j => j.Lines)
            .ThenInclude(l => l.Account)
            .FirstOrDefaultAsync(j => j.Id == id);
    }

    public async Task<JournalEntry?> GetByNumberAsync(string entryNumber)
    {
        return await _context.JournalEntries
            .Include(j => j.Lines)
            .FirstOrDefaultAsync(j => j.EntryNumber == entryNumber);
    }

    public async Task<IEnumerable<JournalEntry>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.JournalEntries
            .Include(j => j.Lines)
            .OrderByDescending(j => j.EntryDate)
            .ThenByDescending(j => j.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<JournalEntry>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await _context.JournalEntries
            .Include(j => j.Lines)
            .Where(j => j.EntryDate >= from && j.EntryDate <= to)
            .OrderBy(j => j.EntryDate)
            .ToListAsync();
    }

    public async Task<JournalEntry> CreateAsync(CreateJournalEntryInput input)
    {
        // Validate that debits equal credits
        var totalDebit = input.Lines.Sum(l => l.DebitAmount);
        var totalCredit = input.Lines.Sum(l => l.CreditAmount);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException(
                $"Journal entry must balance. Debits: {totalDebit}, Credits: {totalCredit}");
        }

        var entryNumber = await GenerateEntryNumberAsync();

        var entry = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = entryNumber,
            EntryDate = input.EntryDate ?? DateTime.UtcNow,
            Description = input.Description,
            Reference = input.Reference,
            Type = Enum.Parse<JournalEntryType>(input.Type),
            Status = JournalEntryStatus.Draft,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            InvoiceId = input.InvoiceId,
            PaymentId = input.PaymentId,
            CreatedAt = DateTime.UtcNow
        };

        int lineNumber = 1;
        foreach (var lineInput in input.Lines)
        {
            var line = new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                JournalEntryId = entry.Id,
                LineNumber = lineNumber++,
                AccountId = lineInput.AccountId,
                Description = lineInput.Description,
                DebitAmount = lineInput.DebitAmount,
                CreditAmount = lineInput.CreditAmount,
                CreatedAt = DateTime.UtcNow
            };

            entry.Lines.Add(line);
        }

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Journal entry created: {EntryNumber}", entryNumber);

        return entry;
    }

    public async Task<JournalEntry?> PostAsync(Guid id)
    {
        var entry = await _context.JournalEntries
            .Include(j => j.Lines)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (entry == null) return null;

        if (entry.Status != JournalEntryStatus.Draft)
        {
            _logger.LogWarning("Cannot post journal entry {EntryNumber} - not in draft status",
                entry.EntryNumber);
            return entry;
        }

        // Update account balances
        /*
        foreach (var line in entry.Lines)
        {
            await _accountService.UpdateBalanceAsync(
                line.AccountId,
                line.DebitAmount - line.CreditAmount);
        }
        */

        entry.Status = JournalEntryStatus.Posted;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Journal entry posted: {EntryNumber}", entry.EntryNumber);

        return entry;
    }

    public async Task<JournalEntry?> ReverseEntryAsync(Guid id, string? reason)
    {
        var original = await _context.JournalEntries
            .Include(j => j.Lines)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (original == null) return null;

        if (original.Status != JournalEntryStatus.Posted)
        {
            _logger.LogWarning("Cannot reverse journal entry {EntryNumber} - not posted",
                original.EntryNumber);
            return null;
        }

        // Create reversing entry
        var reversingLines = original.Lines.Select(l => new CreateJournalEntryLineInput(
            l.AccountId,
            $"Reversal: {l.Description}",
            l.CreditAmount,  // Swap debit and credit
            l.DebitAmount
        )).ToList();

        var reversingEntry = await CreateAsync(new CreateJournalEntryInput(
            DateTime.UtcNow,
            $"Reversal of {original.EntryNumber}: {reason}",
            original.EntryNumber,
            "Reversing",
            original.InvoiceId,
            original.PaymentId,
            reversingLines
        ));

        reversingEntry.IsReversing = true;
        reversingEntry.ReversedEntryId = original.Id;

        original.Status = JournalEntryStatus.Reversed;
        original.UpdatedAt = DateTime.UtcNow;

        // Post the reversing entry
        await PostAsync(reversingEntry.Id);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Journal entry {EntryNumber} reversed by {ReversingEntry}",
            original.EntryNumber, reversingEntry.EntryNumber);

        return reversingEntry;
    }

    public async Task<bool> VoidAsync(Guid id, string? reason)
    {
        var entry = await _context.JournalEntries.FindAsync(id);
        if (entry == null) return false;

        if (entry.Status == JournalEntryStatus.Posted)
        {
            // Must reverse instead of void
            await ReverseEntryAsync(id, reason);
            return true;
        }

        entry.Status = JournalEntryStatus.Voided;
        entry.Description = $"{entry.Description}\nVoided: {reason}";
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Journal entry {EntryNumber} voided: {Reason}",
            entry.EntryNumber, reason);

        return true;
    }

    private async Task<string> GenerateEntryNumberAsync()
    {
        var date = DateTime.UtcNow;
        var prefix = $"JE-{date:yyyyMM}";

        var lastEntry = await _context.JournalEntries
            .Where(j => j.EntryNumber.StartsWith(prefix))
            .OrderByDescending(j => j.EntryNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastEntry != null)
        {
            var lastSequence = lastEntry.EntryNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSequence, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"{prefix}-{sequence:D4}";
    }
}
