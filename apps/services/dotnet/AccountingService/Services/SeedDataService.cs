using AccountingService.Data;
using AccountingService.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AccountingService.Services;

public interface ISeedDataService
{
    Task SeedAsync();
}

/// <summary>
/// Seeds additional demo accounting data (invoices, payments, journal entries) in an
/// idempotent way, so it also applies to already-existing development databases.
/// The baseline demo data lives in <see cref="AccountingDbContext.OnModelCreating"/> (HasData);
/// this service extends it and checks by document number before inserting.
/// </summary>
public class SeedDataService : ISeedDataService
{
    private readonly AccountingDbContext _context;
    private readonly ILogger<SeedDataService> _logger;

    // Chart of accounts IDs (must match AccountingDbContext.SeedData)
    private static readonly Guid BankAccountId = Guid.Parse("a0000000-0000-0000-0000-000000000002");
    private static readonly Guid AccountsReceivableId = Guid.Parse("a0000000-0000-0000-0000-000000000003");
    private static readonly Guid RevenueAccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005");

    // Customers from MasterdataService seed
    private static readonly Guid CustomerMediVitaId = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f");
    private static readonly Guid CustomerRobertId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48b");

    public SeedDataService(AccountingDbContext context, ILogger<SeedDataService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting AccountingService demo data seeding...");

            var seeded = await EnsureExtendedDemoData();
            var refreshed = await RefreshDemoDocumentDates();

            _logger.LogInformation(
                "AccountingService demo data seeding completed ({Seeded} new document(s), {Refreshed} document(s) date-refreshed)",
                seeded,
                refreshed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during AccountingService demo data seeding");
            throw;
        }
    }

    private async Task<int> EnsureExtendedDemoData()
    {
        // Demo document dates are computed relative to the current date so the seeded
        // data always stays fresh (recent invoices, current due dates, recent payments).
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        // Fast path: already seeded
        if (await _context.Invoices.AnyAsync(i => i.InvoiceNumber == "INV-2026-0004") &&
            await _context.Invoices.AnyAsync(i => i.InvoiceNumber == "INV-2026-0005"))
        {
            _logger.LogInformation("Extended demo invoices already present, nothing to seed.");
            return 0;
        }

        var companyId = AccountingDbContext.DemoCompanyId;
        var created = 0;

        // ---- INV-2026-0004 : MediVita Pharmaceuticals (business customer) ----
        var invoice4Id = Guid.Parse("c0000000-0000-0000-0000-000000000004");
        var invoice4LineId = Guid.Parse("c0000000-0000-0000-0000-000000000026");
        if (!await _context.Invoices.AnyAsync(i => i.InvoiceNumber == "INV-2026-0004"))
        {
            _context.Invoices.Add(new Invoice
            {
                Id = invoice4Id,
                CompanyId = companyId,
                InvoiceNumber = "INV-2026-0004",
                Type = InvoiceType.SalesInvoice,
                Status = InvoiceStatus.Sent,
                CustomerId = CustomerMediVitaId,
                CustomerName = "MediVita Pharmaceuticals",
                BillingAddress = "123 Healthcare Boulevard",
                BillingCity = "New York",
                BillingPostalCode = "10001",
                BillingCountry = "USA",
                IssueDate = today.AddDays(-30),
                DueDate = today.AddDays(15),
                Subtotal = 320.00m,
                TaxAmount = 60.80m,
                TaxRate = 0.19m,
                DiscountAmount = 0.00m,
                Total = 380.80m,
                AmountPaid = 150.00m,
                Currency = "EUR",
                Notes = "Laboratory equipment service agreement.",
                InternalNotes = "Seeded invoice for MediVita Pharmaceuticals",
                PaymentTerms = "Net 30",
                CreatedAt = today.AddDays(-30)
            });

            _context.InvoiceLineItems.Add(new InvoiceLineItem
            {
                Id = invoice4LineId,
                InvoiceId = invoice4Id,
                LineNumber = 1,
                Description = "Laboratory Equipment Service",
                Sku = "LAB-SVC-001",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                AccountId = RevenueAccountId,
                Quantity = 4,
                Unit = "unit",
                UnitPrice = 80.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 60.80m,
                Total = 380.80m,
                CreatedAt = today.AddDays(-30)
            });
            created++;
        }

        // ---- INV-2026-0005 : Robert Johnson (WellnessRx) ----
        var invoice5Id = Guid.Parse("c0000000-0000-0000-0000-000000000005");
        var invoice5LineId = Guid.Parse("c0000000-0000-0000-0000-000000000027");
        if (!await _context.Invoices.AnyAsync(i => i.InvoiceNumber == "INV-2026-0005"))
        {
            _context.Invoices.Add(new Invoice
            {
                Id = invoice5Id,
                CompanyId = companyId,
                InvoiceNumber = "INV-2026-0005",
                Type = InvoiceType.SalesInvoice,
                Status = InvoiceStatus.Sent,
                CustomerId = CustomerRobertId,
                CustomerName = "Robert Johnson",
                BillingAddress = "456 Medical Center Dr",
                BillingCity = "Chicago",
                BillingPostalCode = "60601",
                BillingCountry = "USA",
                IssueDate = today.AddDays(-20),
                DueDate = today.AddDays(15),
                PaidDate = today.AddDays(-15),
                Subtotal = 210.00m,
                TaxAmount = 39.90m,
                TaxRate = 0.19m,
                DiscountAmount = 0.00m,
                Total = 249.90m,
                AmountPaid = 249.90m,
                Currency = "EUR",
                Notes = "Wellness consultation package.",
                InternalNotes = "Seeded invoice for Robert Johnson - WellnessRx",
                PaymentTerms = "Net 30",
                CreatedAt = today.AddDays(-20)
            });

            _context.InvoiceLineItems.Add(new InvoiceLineItem
            {
                Id = invoice5LineId,
                InvoiceId = invoice5Id,
                LineNumber = 1,
                Description = "Wellness Consultation Package",
                Sku = "WELL-CON-001",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000002"),
                AccountId = RevenueAccountId,
                Quantity = 3,
                Unit = "pack",
                UnitPrice = 70.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 39.90m,
                Total = 249.90m,
                CreatedAt = today.AddDays(-20)
            });
            created++;
        }

        // ---- Payments ----
        if (!await _context.PaymentRecords.AnyAsync(p => p.PaymentNumber == "PAY-2026-0004"))
        {
            _context.PaymentRecords.Add(new PaymentRecord
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000024"),
                CompanyId = companyId,
                PaymentNumber = "PAY-2026-0004",
                Type = PaymentRecordType.CustomerPayment,
                Status = PaymentRecordStatus.Completed,
                InvoiceId = invoice4Id,
                Method = PaymentMethod.BankTransfer,
                Amount = 150.00m,
                Currency = "EUR",
                PaymentDate = today.AddDays(-25),
                ClearedDate = today.AddDays(-24),
                Reference = "PAYREF-MEDIVITA-01",
                TransactionId = "TX456789",
                Notes = "Partial payment - MediVita service invoice",
                PayerName = "MediVita Pharmaceuticals",
                PayeeName = "ACME Corp",
                CreatedAt = today.AddDays(-25)
            });
            created++;
        }

        if (!await _context.PaymentRecords.AnyAsync(p => p.PaymentNumber == "PAY-2026-0005"))
        {
            _context.PaymentRecords.Add(new PaymentRecord
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000025"),
                CompanyId = companyId,
                PaymentNumber = "PAY-2026-0005",
                Type = PaymentRecordType.CustomerPayment,
                Status = PaymentRecordStatus.Completed,
                InvoiceId = invoice5Id,
                Method = PaymentMethod.CreditCard,
                Amount = 249.90m,
                Currency = "EUR",
                PaymentDate = today.AddDays(-15),
                ClearedDate = today.AddDays(-15),
                Reference = "CC-2026-002",
                TransactionId = "TX901234",
                Notes = "Credit card payment - wellness package",
                PayerName = "Robert Johnson",
                PayeeName = "ACME Corp",
                CreatedAt = today.AddDays(-15)
            });
            created++;
        }

        // ---- Journal entries (double-entry bookkeeping) ----
        var je12Id = Guid.Parse("d0000000-0000-0000-0000-000000000012");
        var je13Id = Guid.Parse("d0000000-0000-0000-0000-000000000013");
        var je14Id = Guid.Parse("d0000000-0000-0000-0000-000000000014");
        var je15Id = Guid.Parse("d0000000-0000-0000-0000-000000000015");

        if (!await _context.JournalEntries.AnyAsync(j => j.EntryNumber == "JE-2026-0012"))
        {
            _context.JournalEntries.Add(new JournalEntry
            {
                Id = je12Id,
                CompanyId = companyId,
                EntryNumber = "JE-2026-0012",
                EntryDate = today.AddDays(-30),
                Description = "Sales invoice INV-2026-0004 - MediVita Pharmaceuticals",
                Reference = "INV-2026-0004",
                Type = JournalEntryType.Sales,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 380.80m,
                TotalCredit = 380.80m,
                Currency = "EUR",
                InvoiceId = invoice4Id,
                CreatedAt = today.AddDays(-30)
            });
            _context.JournalEntryLines.AddRange(
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000026"), JournalEntryId = je12Id, LineNumber = 1, AccountId = AccountsReceivableId, Description = "Accounts Receivable - INV-2026-0004", DebitAmount = 380.80m, CreditAmount = 0, Currency = "EUR", CreatedAt = today.AddDays(-30) },
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000027"), JournalEntryId = je12Id, LineNumber = 2, AccountId = RevenueAccountId, Description = "Sales Revenue - INV-2026-0004", DebitAmount = 0, CreditAmount = 380.80m, Currency = "EUR", CreatedAt = today.AddDays(-30) }
            );
            created++;
        }

        if (!await _context.JournalEntries.AnyAsync(j => j.EntryNumber == "JE-2026-0013"))
        {
            _context.JournalEntries.Add(new JournalEntry
            {
                Id = je13Id,
                CompanyId = companyId,
                EntryNumber = "JE-2026-0013",
                EntryDate = today.AddDays(-25),
                Description = "Payment received PAY-2026-0004 - MediVita Pharmaceuticals",
                Reference = "PAY-2026-0004",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 150.00m,
                TotalCredit = 150.00m,
                Currency = "EUR",
                PaymentId = Guid.Parse("c0000000-0000-0000-0000-000000000024"),
                CreatedAt = today.AddDays(-25)
            });
            _context.JournalEntryLines.AddRange(
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000028"), JournalEntryId = je13Id, LineNumber = 1, AccountId = BankAccountId, Description = "Bank deposit - PAY-2026-0004", DebitAmount = 150.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = today.AddDays(-25) },
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000029"), JournalEntryId = je13Id, LineNumber = 2, AccountId = AccountsReceivableId, Description = "Accounts Receivable - PAY-2026-0004", DebitAmount = 0, CreditAmount = 150.00m, Currency = "EUR", CreatedAt = today.AddDays(-25) }
            );
            created++;
        }

        if (!await _context.JournalEntries.AnyAsync(j => j.EntryNumber == "JE-2026-0014"))
        {
            _context.JournalEntries.Add(new JournalEntry
            {
                Id = je14Id,
                CompanyId = companyId,
                EntryNumber = "JE-2026-0014",
                EntryDate = today.AddDays(-20),
                Description = "Sales invoice INV-2026-0005 - Robert Johnson",
                Reference = "INV-2026-0005",
                Type = JournalEntryType.Sales,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 249.90m,
                TotalCredit = 249.90m,
                Currency = "EUR",
                InvoiceId = invoice5Id,
                CreatedAt = today.AddDays(-20)
            });
            _context.JournalEntryLines.AddRange(
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000030"), JournalEntryId = je14Id, LineNumber = 1, AccountId = AccountsReceivableId, Description = "Accounts Receivable - INV-2026-0005", DebitAmount = 249.90m, CreditAmount = 0, Currency = "EUR", CreatedAt = today.AddDays(-20) },
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000031"), JournalEntryId = je14Id, LineNumber = 2, AccountId = RevenueAccountId, Description = "Sales Revenue - INV-2026-0005", DebitAmount = 0, CreditAmount = 249.90m, Currency = "EUR", CreatedAt = today.AddDays(-20) }
            );
            created++;
        }

        if (!await _context.JournalEntries.AnyAsync(j => j.EntryNumber == "JE-2026-0015"))
        {
            _context.JournalEntries.Add(new JournalEntry
            {
                Id = je15Id,
                CompanyId = companyId,
                EntryNumber = "JE-2026-0015",
                EntryDate = today.AddDays(-15),
                Description = "Payment received PAY-2026-0005 - Robert Johnson",
                Reference = "PAY-2026-0005",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 249.90m,
                TotalCredit = 249.90m,
                Currency = "EUR",
                PaymentId = Guid.Parse("c0000000-0000-0000-0000-000000000025"),
                CreatedAt = today.AddDays(-15)
            });
            _context.JournalEntryLines.AddRange(
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000032"), JournalEntryId = je15Id, LineNumber = 1, AccountId = BankAccountId, Description = "Bank deposit - PAY-2026-0005", DebitAmount = 249.90m, CreditAmount = 0, Currency = "EUR", CreatedAt = today.AddDays(-15) },
                new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000033"), JournalEntryId = je15Id, LineNumber = 2, AccountId = AccountsReceivableId, Description = "Accounts Receivable - PAY-2026-0005", DebitAmount = 0, CreditAmount = 249.90m, Currency = "EUR", CreatedAt = today.AddDays(-15) }
            );
            created++;
        }

        await _context.SaveChangesAsync();
        return created;
    }

    /// <summary>
    /// Re-slides the dates of all seeded demo documents (invoices, payments, journal
    /// entries and their lines) relative to the current date, so the demo data always
    /// looks fresh — even on databases that were seeded previously. Idempotent: only
    /// updates dates, never inserts or deletes.
    /// </summary>
    private async Task<int> RefreshDemoDocumentDates()
    {
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var refreshed = 0;

        // ---- Invoices ----
        var invoiceNumbers = new[]
        {
            "INV-2026-0001", "INV-2026-0002", "INV-2026-0003", "INV-2026-0004", "INV-2026-0005"
        };
        var invoiceDates = new (DateTime Issue, DateTime Due, DateTime? Paid)[]
        {
            (today.AddDays(-60), today.AddDays(-30), null),
            (today.AddDays(-45), today.AddDays(-15), today.AddDays(-40)),
            (today.AddDays(-40), today.AddDays(-10), today.AddDays(-35)),
            (today.AddDays(-30), today.AddDays(15), null),
            (today.AddDays(-20), today.AddDays(15), today.AddDays(-15)),
        };

        var invoices = await _context.Invoices
            .Where(i => invoiceNumbers.Contains(i.InvoiceNumber))
            .ToListAsync();
        foreach (var inv in invoices)
        {
            var idx = Array.IndexOf(invoiceNumbers, inv.InvoiceNumber);
            if (idx < 0) continue;
            inv.IssueDate = invoiceDates[idx].Issue;
            inv.DueDate = invoiceDates[idx].Due;
            inv.PaidDate = invoiceDates[idx].Paid;
            inv.CreatedAt = invoiceDates[idx].Issue;
            inv.UpdatedAt = today;
            refreshed++;
        }

        // Invoice line items follow their invoice's issue date.
        var invoiceIds = invoices.Select(i => i.Id).ToList();
        if (invoiceIds.Count > 0)
        {
            var lineItems = await _context.InvoiceLineItems
                .Where(l => invoiceIds.Contains(l.InvoiceId))
                .ToListAsync();
            foreach (var line in lineItems)
            {
                var inv = invoices.FirstOrDefault(i => i.Id == line.InvoiceId);
                var idx = inv == null ? -1 : Array.IndexOf(invoiceNumbers, inv.InvoiceNumber);
                if (idx >= 0)
                {
                    line.CreatedAt = invoiceDates[idx].Issue;
                }
            }
        }

        // ---- Payments ----
        var paymentNumbers = new[]
        {
            "PAY-2026-0001", "PAY-2026-0002", "PAY-2026-0003", "PAY-2026-0004", "PAY-2026-0005"
        };
        var paymentDates = new (DateTime Payment, DateTime Cleared)[]
        {
            (today.AddDays(-55), today.AddDays(-54)),
            (today.AddDays(-40), today.AddDays(-40)),
            (today.AddDays(-35), today.AddDays(-34)),
            (today.AddDays(-25), today.AddDays(-24)),
            (today.AddDays(-15), today.AddDays(-15)),
        };

        var payments = await _context.PaymentRecords
            .Where(p => paymentNumbers.Contains(p.PaymentNumber))
            .ToListAsync();
        foreach (var payment in payments)
        {
            var idx = Array.IndexOf(paymentNumbers, payment.PaymentNumber);
            if (idx < 0) continue;
            payment.PaymentDate = paymentDates[idx].Payment;
            payment.ClearedDate = paymentDates[idx].Cleared;
            payment.CreatedAt = paymentDates[idx].Payment;
            payment.UpdatedAt = today;
            refreshed++;
        }

        // ---- Journal entries ----
        var entryDates = new Dictionary<string, DateTime>
        {
            ["JE-2025-0001"] = today.AddMonths(-8),
            ["JE-2026-0001"] = today.AddDays(-60),
            ["JE-2026-0002"] = today.AddDays(-45),
            ["JE-2026-0003"] = today.AddDays(-40),
            ["JE-2026-0004"] = today.AddDays(-55),
            ["JE-2026-0005"] = today.AddDays(-40),
            ["JE-2026-0006"] = today.AddDays(-35),
            ["JE-2026-0007"] = today.AddDays(-30),
            ["JE-2026-0008"] = today.AddMonths(-2),
            ["JE-2026-0009"] = today.AddMonths(-1),
            ["JE-2026-0010"] = today.AddDays(-15),
            ["JE-2026-0011"] = today.AddDays(-30),
            ["JE-2026-0012"] = today.AddDays(-30),
            ["JE-2026-0013"] = today.AddDays(-25),
            ["JE-2026-0014"] = today.AddDays(-20),
            ["JE-2026-0015"] = today.AddDays(-15),
        };

        var entries = await _context.JournalEntries
            .Where(j => entryDates.Keys.Contains(j.EntryNumber))
            .ToListAsync();
        foreach (var entry in entries)
        {
            if (!entryDates.TryGetValue(entry.EntryNumber, out var date)) continue;
            entry.EntryDate = date;
            entry.CreatedAt = date;
            entry.UpdatedAt = today;
            refreshed++;
        }

        // Journal entry lines follow their parent entry's date.
        var entryIds = entries.Select(e => e.Id).ToList();
        if (entryIds.Count > 0)
        {
            var jeLines = await _context.JournalEntryLines
                .Where(l => entryIds.Contains(l.JournalEntryId))
                .ToListAsync();
            foreach (var line in jeLines)
            {
                var entry = entries.FirstOrDefault(e => e.Id == line.JournalEntryId);
                if (entry != null)
                {
                    line.CreatedAt = entry.EntryDate;
                }
            }
        }

        await _context.SaveChangesAsync();
        return refreshed;
    }
}
