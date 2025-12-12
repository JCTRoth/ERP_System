using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IPaymentRecordService
{
    Task<PaymentRecord?> GetByIdAsync(Guid id);
    Task<PaymentRecord?> GetByNumberAsync(string paymentNumber);
    Task<IEnumerable<PaymentRecord>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<PaymentRecord>> GetByInvoiceAsync(Guid invoiceId);
    Task<IEnumerable<PaymentRecord>> GetByDateRangeAsync(DateTime from, DateTime to);
    Task<PaymentRecord> CreateAsync(CreatePaymentRecordInput input);
    Task<PaymentRecord?> ConfirmAsync(Guid id);
    Task<PaymentRecord?> VoidAsync(Guid id, string? reason);
    Task<PaymentRecord?> RefundAsync(Guid id, decimal amount, string? reason);
}

public class PaymentRecordService : IPaymentRecordService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<PaymentRecordService> _logger;
    private readonly IJournalEntryService _journalEntryService;
    private readonly IInvoiceService _invoiceService;

    public PaymentRecordService(
        AccountingDbContext context,
        ILogger<PaymentRecordService> logger,
        IJournalEntryService journalEntryService,
        IInvoiceService invoiceService)
    {
        _context = context;
        _logger = logger;
        _journalEntryService = journalEntryService;
        _invoiceService = invoiceService;
    }

    public async Task<PaymentRecord?> GetByIdAsync(Guid id)
    {
        return await _context.PaymentRecords
            .Include(p => p.Invoice)
            .Include(p => p.JournalEntry)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<PaymentRecord?> GetByNumberAsync(string paymentNumber)
    {
        return await _context.PaymentRecords
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.PaymentNumber == paymentNumber);
    }

    public async Task<IEnumerable<PaymentRecord>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.PaymentRecords
            .Include(p => p.Invoice)
            .OrderByDescending(p => p.PaymentDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<PaymentRecord>> GetByInvoiceAsync(Guid invoiceId)
    {
        return await _context.PaymentRecords
            .Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<PaymentRecord>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await _context.PaymentRecords
            .Where(p => p.PaymentDate >= from && p.PaymentDate <= to)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync();
    }

    public async Task<PaymentRecord> CreateAsync(CreatePaymentRecordInput input)
    {
        var paymentNumber = await GeneratePaymentNumberAsync();

        var payment = new PaymentRecord
        {
            Id = Guid.NewGuid(),
            PaymentNumber = paymentNumber,
            InvoiceId = input.InvoiceId,
            PaymentDate = input.PaymentDate ?? DateTime.UtcNow,
            Amount = input.Amount,
            Currency = input.Currency ?? "USD",
            PaymentMethod = Enum.Parse<PaymentMethod>(input.PaymentMethod),
            ReferenceNumber = input.ReferenceNumber,
            BankAccountId = input.BankAccountId,
            Notes = input.Notes,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentRecords.Add(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment record created: {PaymentNumber} for amount {Amount}",
            paymentNumber, input.Amount);

        return payment;
    }

    public async Task<PaymentRecord?> ConfirmAsync(Guid id)
    {
        var payment = await _context.PaymentRecords
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null) return null;

        if (payment.Status != PaymentStatus.Pending)
        {
            _logger.LogWarning("Cannot confirm payment {PaymentNumber} - not in pending status",
                payment.PaymentNumber);
            return payment;
        }

        // Create journal entry for payment
        var journalEntry = await CreatePaymentJournalEntryAsync(payment);
        payment.JournalEntryId = journalEntry.Id;

        // Post the journal entry
        await _journalEntryService.PostAsync(journalEntry.Id);

        // Record payment on invoice
        if (payment.InvoiceId.HasValue)
        {
            await _invoiceService.RecordPaymentAsync(payment.InvoiceId.Value, payment.Amount);
        }

        payment.Status = PaymentStatus.Confirmed;
        payment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment {PaymentNumber} confirmed", payment.PaymentNumber);

        return payment;
    }

    public async Task<PaymentRecord?> VoidAsync(Guid id, string? reason)
    {
        var payment = await _context.PaymentRecords.FindAsync(id);
        if (payment == null) return null;

        if (payment.Status == PaymentStatus.Voided)
        {
            return payment;
        }

        // Reverse journal entry if confirmed
        if (payment.Status == PaymentStatus.Confirmed && payment.JournalEntryId.HasValue)
        {
            await _journalEntryService.ReverseEntryAsync(payment.JournalEntryId.Value, reason);

            // Reverse invoice payment record
            if (payment.InvoiceId.HasValue)
            {
                await _invoiceService.RecordPaymentAsync(payment.InvoiceId.Value, -payment.Amount);
            }
        }

        payment.Status = PaymentStatus.Voided;
        payment.Notes = $"{payment.Notes}\nVoided: {reason}";
        payment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment {PaymentNumber} voided: {Reason}",
            payment.PaymentNumber, reason);

        return payment;
    }

    public async Task<PaymentRecord?> RefundAsync(Guid id, decimal amount, string? reason)
    {
        var originalPayment = await _context.PaymentRecords
            .FirstOrDefaultAsync(p => p.Id == id);

        if (originalPayment == null) return null;

        if (originalPayment.Status != PaymentStatus.Confirmed)
        {
            _logger.LogWarning("Cannot refund payment {PaymentNumber} - not confirmed",
                originalPayment.PaymentNumber);
            return null;
        }

        if (amount > originalPayment.Amount - originalPayment.RefundedAmount)
        {
            throw new InvalidOperationException(
                $"Refund amount {amount} exceeds available amount " +
                $"{originalPayment.Amount - originalPayment.RefundedAmount}");
        }

        // Create refund payment record
        var refundPayment = new PaymentRecord
        {
            Id = Guid.NewGuid(),
            PaymentNumber = await GeneratePaymentNumberAsync(),
            InvoiceId = originalPayment.InvoiceId,
            PaymentDate = DateTime.UtcNow,
            Amount = -amount,
            Currency = originalPayment.Currency,
            PaymentMethod = originalPayment.PaymentMethod,
            ReferenceNumber = $"REFUND-{originalPayment.PaymentNumber}",
            BankAccountId = originalPayment.BankAccountId,
            Notes = $"Refund for {originalPayment.PaymentNumber}: {reason}",
            Status = PaymentStatus.Pending,
            IsRefund = true,
            OriginalPaymentId = id,
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentRecords.Add(refundPayment);

        // Update original payment
        originalPayment.RefundedAmount += amount;
        originalPayment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Confirm refund
        await ConfirmAsync(refundPayment.Id);

        _logger.LogInformation("Refund {RefundNumber} created for {PaymentNumber}, amount {Amount}",
            refundPayment.PaymentNumber, originalPayment.PaymentNumber, amount);

        return refundPayment;
    }

    private async Task<JournalEntry> CreatePaymentJournalEntryAsync(PaymentRecord payment)
    {
        var invoice = payment.Invoice;
        var isReceivable = invoice?.Type == InvoiceType.SalesInvoice;

        // Determine accounts based on payment type
        var cashAccount = await GetCashAccountAsync(payment.BankAccountId);
        var offsetAccount = isReceivable
            ? await GetAccountsReceivableAccount()
            : await GetAccountsPayableAccount();

        var lines = new List<CreateJournalEntryLineInput>();

        if (payment.Amount > 0)
        {
            if (isReceivable)
            {
                // Customer payment: Debit Cash, Credit AR
                lines.Add(new CreateJournalEntryLineInput(
                    cashAccount.Id,
                    $"Payment received: {payment.PaymentNumber}",
                    payment.Amount,
                    0
                ));
                lines.Add(new CreateJournalEntryLineInput(
                    offsetAccount.Id,
                    $"Payment received: {payment.PaymentNumber}",
                    0,
                    payment.Amount
                ));
            }
            else
            {
                // Vendor payment: Debit AP, Credit Cash
                lines.Add(new CreateJournalEntryLineInput(
                    offsetAccount.Id,
                    $"Payment made: {payment.PaymentNumber}",
                    payment.Amount,
                    0
                ));
                lines.Add(new CreateJournalEntryLineInput(
                    cashAccount.Id,
                    $"Payment made: {payment.PaymentNumber}",
                    0,
                    payment.Amount
                ));
            }
        }
        else
        {
            // Refund - reverse the entries
            var refundAmount = Math.Abs(payment.Amount);
            if (isReceivable)
            {
                lines.Add(new CreateJournalEntryLineInput(
                    offsetAccount.Id,
                    $"Refund: {payment.PaymentNumber}",
                    refundAmount,
                    0
                ));
                lines.Add(new CreateJournalEntryLineInput(
                    cashAccount.Id,
                    $"Refund: {payment.PaymentNumber}",
                    0,
                    refundAmount
                ));
            }
            else
            {
                lines.Add(new CreateJournalEntryLineInput(
                    cashAccount.Id,
                    $"Refund received: {payment.PaymentNumber}",
                    refundAmount,
                    0
                ));
                lines.Add(new CreateJournalEntryLineInput(
                    offsetAccount.Id,
                    $"Refund received: {payment.PaymentNumber}",
                    0,
                    refundAmount
                ));
            }
        }

        return await _journalEntryService.CreateAsync(new CreateJournalEntryInput(
            payment.PaymentDate,
            $"Payment: {payment.PaymentNumber}",
            payment.PaymentNumber,
            "Payment",
            payment.InvoiceId,
            payment.Id,
            lines
        ));
    }

    private async Task<Account> GetCashAccountAsync(Guid? bankAccountId)
    {
        if (bankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .Include(b => b.GlAccount)
                .FirstOrDefaultAsync(b => b.Id == bankAccountId.Value);

            if (bankAccount?.GlAccount != null)
            {
                return bankAccount.GlAccount;
            }
        }

        // Default cash account
        return await _context.Accounts.FirstAsync(a => a.AccountCode == "1010");
    }

    private async Task<Account> GetAccountsReceivableAccount()
    {
        return await _context.Accounts.FirstAsync(a => a.AccountCode == "1200");
    }

    private async Task<Account> GetAccountsPayableAccount()
    {
        return await _context.Accounts.FirstAsync(a => a.AccountCode == "2100");
    }

    private async Task<string> GeneratePaymentNumberAsync()
    {
        var date = DateTime.UtcNow;
        var prefix = $"PAY-{date:yyyyMM}";

        var lastPayment = await _context.PaymentRecords
            .Where(p => p.PaymentNumber.StartsWith(prefix))
            .OrderByDescending(p => p.PaymentNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastPayment != null)
        {
            var lastSequence = lastPayment.PaymentNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSequence, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"{prefix}-{sequence:D4}";
    }
}
