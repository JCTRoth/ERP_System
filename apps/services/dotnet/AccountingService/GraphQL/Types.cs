using AccountingService.Models;
using AccountingService.Services;
using AccountingService.Data;
using AccountingService.DTOs;
using Microsoft.EntityFrameworkCore;

namespace AccountingService.GraphQL;

[ExtendObjectType(typeof(Account))]
public class AccountType
{
    [GraphQLDescription("Get child accounts")]
    public async Task<IEnumerable<Account>> GetChildAccounts(
        [Parent] Account account,
        [Service] IAccountService accountService)
    {
        return await accountService.GetChildAccountsAsync(account.Id);
    }

    [GraphQLDescription("Get parent account")]
    public async Task<Account?> GetParentAccount(
        [Parent] Account account,
        [Service] IAccountService accountService)
    {
        if (account.ParentAccountId == null) return null;
        return await accountService.GetByIdAsync(account.ParentAccountId.Value);
    }
}

[ExtendObjectType(typeof(Invoice))]
public class InvoiceType
{
    [GraphQLDescription("Get invoice line items")]
    public async Task<IEnumerable<InvoiceLineItem>> GetLineItems(
        [Parent] Invoice invoice,
        [Service] AccountingDbContext context)
    {
        return await context.InvoiceLineItems
            .Where(l => l.InvoiceId == invoice.Id)
            .OrderBy(l => l.LineNumber)
            .ToListAsync();
    }

    [GraphQLDescription("Get payments for this invoice")]
    public async Task<IEnumerable<PaymentRecord>> GetPayments(
        [Parent] Invoice invoice,
        [Service] AccountingDbContext context)
    {
        return await context.PaymentRecords
            .Where(p => p.InvoiceId == invoice.Id)
            .ToListAsync();
    }

    [GraphQLDescription("Get balance due")]
    public decimal GetBalanceDue([Parent] Invoice invoice)
    {
        return invoice.TotalAmount - invoice.PaidAmount;
    }

    [GraphQLDescription("Check if invoice is overdue")]
    public bool IsOverdue([Parent] Invoice invoice)
    {
        if (invoice.Status == InvoiceStatus.Paid ||
            invoice.Status == InvoiceStatus.Cancelled ||
            invoice.Status == InvoiceStatus.Void)
        {
            return false;
        }

        var dueDate = invoice.DueDate;
        return DateTime.UtcNow > dueDate;
    }

    [GraphQLDescription("Get days overdue")]
    public int GetDaysOverdue([Parent] Invoice invoice)
    {
        var dueDate = invoice.DueDate;
        if (DateTime.UtcNow <= dueDate) return 0;
        return (DateTime.UtcNow - dueDate).Days;
    }
}

[ExtendObjectType(typeof(JournalEntry))]
public class JournalEntryType
{
    [GraphQLDescription("Get journal entry lines")]
    public async Task<IEnumerable<JournalEntryLine>> GetLines(
        [Parent] JournalEntry entry,
        [Service] AccountingDbContext context)
    {
        return await context.JournalEntryLines
            .Include(l => l.Account)
            .Where(l => l.JournalEntryId == entry.Id)
            .OrderBy(l => l.LineNumber)
            .ToListAsync();
    }

    [GraphQLDescription("Check if entry is balanced")]
    public bool IsBalanced([Parent] JournalEntry entry)
    {
        return entry.TotalDebit == entry.TotalCredit;
    }
}

[ExtendObjectType(typeof(PaymentRecord))]
public class PaymentRecordType
{
    [GraphQLDescription("Payment method as string")] 
    public string PaymentMethod([Parent] PaymentRecord payment)
        => payment.Method.ToString();

    [GraphQLDescription("Get the invoice this payment applies to")]
    public async Task<Invoice?> GetInvoice(
        [Parent] PaymentRecord payment,
        [Service] IInvoiceService invoiceService)
    {
        if (payment.InvoiceId == null) return null;
        return await invoiceService.GetByIdAsync(payment.InvoiceId.Value);
    }

    [GraphQLDescription("Get the bank account for this payment")]
    public async Task<BankAccount?> GetBankAccount(
        [Parent] PaymentRecord payment,
        [Service] AccountingDbContext context)
    {
        if (payment.BankAccountId == null) return null;
        return await context.BankAccounts
            .FirstOrDefaultAsync(b => b.Id == payment.BankAccountId.Value);
    }
}

[ExtendObjectType(typeof(BankAccount))]
public class BankAccountType
{
    [GraphQLDescription("Get the GL account linked to this bank account")]
    public async Task<Account?> GetGlAccount(
        [Parent] BankAccount bankAccount,
        [Service] IAccountService accountService)
    {
        if (bankAccount.GlAccountId == null) return null;
        return await accountService.GetByIdAsync(bankAccount.GlAccountId.Value);
    }
}

[ExtendObjectType(typeof(JournalEntryLine))]
public class JournalEntryLineType
{
    [GraphQLDescription("Account number for this journal entry line")]
    public string AccountNumber([Parent] JournalEntryLine line)
        => line.Account?.AccountNumber ?? string.Empty;

    [GraphQLDescription("Account name for this journal entry line")]
    public string AccountName([Parent] JournalEntryLine line)
        => line.Account?.Name ?? string.Empty;

    [GraphQLDescription("Debit amount for this journal entry line")]
    public decimal Debit([Parent] JournalEntryLine line)
        => line.DebitAmount;

    [GraphQLDescription("Credit amount for this journal entry line")]
    public decimal Credit([Parent] JournalEntryLine line)
        => line.CreditAmount;
}
