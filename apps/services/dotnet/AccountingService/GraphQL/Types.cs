using AccountingService.Models;
using AccountingService.Services;
using AccountingService.Data;
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
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.GetByInvoiceAsync(invoice.Id);
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

        var dueDate = invoice.DueDate ?? invoice.InvoiceDate.AddDays(30);
        return DateTime.UtcNow > dueDate;
    }

    [GraphQLDescription("Get days overdue")]
    public int GetDaysOverdue([Parent] Invoice invoice)
    {
        var dueDate = invoice.DueDate ?? invoice.InvoiceDate.AddDays(30);
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
        [Service] IBankAccountService bankAccountService)
    {
        if (payment.BankAccountId == null) return null;
        return await bankAccountService.GetByIdAsync(payment.BankAccountId.Value);
    }

    [GraphQLDescription("Get the original payment if this is a refund")]
    public async Task<PaymentRecord?> GetOriginalPayment(
        [Parent] PaymentRecord payment,
        [Service] IPaymentRecordService paymentRecordService)
    {
        if (payment.OriginalPaymentId == null) return null;
        return await paymentRecordService.GetByIdAsync(payment.OriginalPaymentId.Value);
    }
}

[ExtendObjectType(typeof(BankAccount))]
public class BankAccountType
{
    [GraphQLDescription("Get recent transactions")]
    public async Task<IEnumerable<BankTransaction>> GetRecentTransactions(
        [Parent] BankAccount bankAccount,
        [Service] IBankAccountService bankAccountService,
        int take = 10)
    {
        return await bankAccountService.GetTransactionsAsync(bankAccount.Id, 0, take);
    }

    [GraphQLDescription("Get the GL account linked to this bank account")]
    public async Task<Account?> GetGlAccount(
        [Parent] BankAccount bankAccount,
        [Service] IAccountService accountService)
    {
        if (bankAccount.GlAccountId == null) return null;
        return await accountService.GetByIdAsync(bankAccount.GlAccountId.Value);
    }
}
