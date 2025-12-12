using Microsoft.EntityFrameworkCore;
using AccountingService.Data;
using AccountingService.DTOs;
using AccountingService.Models;

namespace AccountingService.Services;

public interface IInvoiceService
{
    Task<Invoice?> GetByIdAsync(Guid id);
    Task<Invoice?> GetByNumberAsync(string invoiceNumber);
    Task<IEnumerable<Invoice>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Invoice>> GetByCustomerAsync(Guid customerId);
    Task<IEnumerable<Invoice>> GetBySupplierAsync(Guid supplierId);
    Task<IEnumerable<Invoice>> GetOverdueAsync();
    Task<Invoice> CreateAsync(CreateInvoiceInput input);
    Task<Invoice?> UpdateStatusAsync(UpdateInvoiceStatusInput input);
    Task<Invoice?> RecordPaymentAsync(Guid invoiceId, decimal amount, string? reference);
    Task<bool> CancelAsync(Guid id, string? reason);
}

public class InvoiceService : IInvoiceService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<InvoiceService> _logger;
    private readonly IJournalEntryService _journalService;
    private readonly IConfiguration _configuration;

    public InvoiceService(
        AccountingDbContext context,
        ILogger<InvoiceService> logger,
        IJournalEntryService journalService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _journalService = journalService;
        _configuration = configuration;
    }

    public async Task<Invoice?> GetByIdAsync(Guid id)
    {
        return await _context.Invoices
            .Include(i => i.LineItems)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<Invoice?> GetByNumberAsync(string invoiceNumber)
    {
        return await _context.Invoices
            .Include(i => i.LineItems)
            .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber);
    }

    public async Task<IEnumerable<Invoice>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Invoices
            .Include(i => i.LineItems)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Invoice>> GetByCustomerAsync(Guid customerId)
    {
        return await _context.Invoices
            .Include(i => i.LineItems)
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Invoice>> GetBySupplierAsync(Guid supplierId)
    {
        return await _context.Invoices
            .Include(i => i.LineItems)
            .Where(i => i.SupplierId == supplierId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Invoice>> GetOverdueAsync()
    {
        var today = DateTime.UtcNow.Date;
        return await _context.Invoices
            .Where(i => i.Status != InvoiceStatus.Paid &&
                        i.Status != InvoiceStatus.Cancelled &&
                        i.DueDate < today)
            .OrderBy(i => i.DueDate)
            .ToListAsync();
    }

    public async Task<Invoice> CreateAsync(CreateInvoiceInput input)
    {
        var invoiceNumber = await GenerateInvoiceNumberAsync(input.Type);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = invoiceNumber,
            Type = Enum.Parse<InvoiceType>(input.Type),
            Status = InvoiceStatus.Draft,
            CustomerId = input.CustomerId,
            SupplierId = input.SupplierId,
            OrderId = input.OrderId,
            OrderNumber = input.OrderNumber,
            CustomerName = input.CustomerName,
            SupplierName = input.SupplierName,
            BillingAddress = input.BillingAddress,
            BillingCity = input.BillingCity,
            BillingPostalCode = input.BillingPostalCode,
            BillingCountry = input.BillingCountry,
            VatNumber = input.VatNumber,
            IssueDate = input.IssueDate ?? DateTime.UtcNow,
            DueDate = input.DueDate,
            TaxRate = input.TaxRate,
            Notes = input.Notes,
            PaymentTerms = input.PaymentTerms ?? "Net 30",
            CreatedAt = DateTime.UtcNow
        };

        decimal subtotal = 0;
        decimal totalTax = 0;

        int lineNumber = 1;
        foreach (var lineInput in input.LineItems)
        {
            var lineSubtotal = lineInput.UnitPrice * lineInput.Quantity;
            var discount = lineSubtotal * lineInput.DiscountPercent;
            var taxableAmount = lineSubtotal - discount;
            var tax = taxableAmount * lineInput.TaxRate;
            var lineTotal = taxableAmount + tax;

            var lineItem = new InvoiceLineItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                LineNumber = lineNumber++,
                Description = lineInput.Description,
                Sku = lineInput.Sku,
                ProductId = lineInput.ProductId,
                AccountId = lineInput.AccountId,
                Quantity = lineInput.Quantity,
                Unit = lineInput.Unit ?? "pcs",
                UnitPrice = lineInput.UnitPrice,
                DiscountPercent = lineInput.DiscountPercent,
                DiscountAmount = discount,
                TaxRate = lineInput.TaxRate,
                TaxAmount = tax,
                Total = lineTotal,
                CreatedAt = DateTime.UtcNow
            };

            invoice.LineItems.Add(lineItem);
            subtotal += lineSubtotal - discount;
            totalTax += tax;
        }

        invoice.Subtotal = subtotal;
        invoice.TaxAmount = totalTax;
        invoice.Total = subtotal + totalTax;

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Invoice created: {InvoiceNumber}", invoiceNumber);

        return invoice;
    }

    public async Task<Invoice?> UpdateStatusAsync(UpdateInvoiceStatusInput input)
    {
        var invoice = await _context.Invoices.FindAsync(input.InvoiceId);
        if (invoice == null) return null;

        var newStatus = Enum.Parse<InvoiceStatus>(input.Status);
        invoice.Status = newStatus;

        if (!string.IsNullOrEmpty(input.InternalNotes))
        {
            invoice.InternalNotes = $"{invoice.InternalNotes}\n{DateTime.UtcNow:yyyy-MM-dd}: {input.InternalNotes}";
        }

        // Create journal entry when invoice is sent
        if (newStatus == InvoiceStatus.Sent && invoice.JournalEntryId == null)
        {
            var journalEntry = await CreateInvoiceJournalEntryAsync(invoice);
            invoice.JournalEntryId = journalEntry.Id;
        }

        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceNumber} status updated to {Status}",
            invoice.InvoiceNumber, newStatus);

        return invoice;
    }

    public async Task<Invoice?> RecordPaymentAsync(Guid invoiceId, decimal amount, string? reference)
    {
        var invoice = await _context.Invoices.FindAsync(invoiceId);
        if (invoice == null) return null;

        invoice.AmountPaid += amount;

        if (invoice.AmountPaid >= invoice.Total)
        {
            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidDate = DateTime.UtcNow;
        }
        else if (invoice.AmountPaid > 0)
        {
            invoice.Status = InvoiceStatus.PartiallyPaid;
        }

        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment recorded for invoice {InvoiceNumber}: {Amount}",
            invoice.InvoiceNumber, amount);

        return invoice;
    }

    public async Task<bool> CancelAsync(Guid id, string? reason)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null) return false;

        if (invoice.Status == InvoiceStatus.Paid)
        {
            _logger.LogWarning("Cannot cancel paid invoice {InvoiceNumber}", invoice.InvoiceNumber);
            return false;
        }

        invoice.Status = InvoiceStatus.Cancelled;
        invoice.InternalNotes = $"{invoice.InternalNotes}\nCancelled: {reason}";
        invoice.UpdatedAt = DateTime.UtcNow;

        // Reverse journal entry if exists
        if (invoice.JournalEntryId.HasValue)
        {
            await _journalService.ReverseEntryAsync(invoice.JournalEntryId.Value, "Invoice cancelled");
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceNumber} cancelled: {Reason}",
            invoice.InvoiceNumber, reason);

        return true;
    }

    private async Task<string> GenerateInvoiceNumberAsync(string type)
    {
        var prefix = type switch
        {
            "SalesInvoice" => "INV",
            "PurchaseInvoice" => "BILL",
            "CreditNote" => "CN",
            "DebitNote" => "DN",
            _ => "INV"
        };

        var date = DateTime.UtcNow;
        var yearPrefix = $"{prefix}-{date:yyyy}";

        var lastInvoice = await _context.Invoices
            .Where(i => i.InvoiceNumber.StartsWith(yearPrefix))
            .OrderByDescending(i => i.InvoiceNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastInvoice != null)
        {
            var lastSequence = lastInvoice.InvoiceNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSequence, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"{yearPrefix}-{sequence:D5}";
    }

    private async Task<JournalEntry> CreateInvoiceJournalEntryAsync(Invoice invoice)
    {
        var arAccountId = Guid.Parse("a0000000-0000-0000-0000-000000000003"); // AR account
        var revenueAccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005"); // Revenue account

        var lines = new List<CreateJournalEntryLineInput>();

        if (invoice.Type == InvoiceType.SalesInvoice)
        {
            // Debit AR, Credit Revenue
            lines.Add(new CreateJournalEntryLineInput(arAccountId, $"Invoice {invoice.InvoiceNumber}", invoice.Total, 0));
            lines.Add(new CreateJournalEntryLineInput(revenueAccountId, $"Invoice {invoice.InvoiceNumber}", 0, invoice.Total));
        }

        return await _journalService.CreateAsync(new CreateJournalEntryInput(
            DateTime.UtcNow,
            $"Invoice {invoice.InvoiceNumber}",
            invoice.InvoiceNumber,
            "Standard",
            invoice.Id,
            null,
            lines
        ));
    }
}
