using AccountingService.Models;
using AccountingService.Services;
using AccountingService.DTOs;
using HotChocolate.Subscriptions;

namespace AccountingService.GraphQL;

public class Mutation
{
    // Account Mutations
    [GraphQLDescription("Create a new account")]
    public async Task<Account> CreateAccount(
        CreateAccountInput input,
        [Service] IAccountService accountService)
    {
        return await accountService.CreateAsync(input);
    }

    [GraphQLDescription("Update an existing account")]
    public async Task<Account?> UpdateAccount(
        Guid id,
        UpdateAccountInput input,
        [Service] IAccountService accountService)
    {
        return await accountService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete an account")]
    public async Task<bool> DeleteAccount(
        Guid id,
        [Service] IAccountService accountService)
    {
        return await accountService.DeleteAsync(id);
    }

    // Invoice Mutations
    [GraphQLDescription("Create a new invoice")]
    public async Task<Invoice> CreateInvoice(
        CreateInvoiceInput input,
        [Service] IInvoiceService invoiceService,
        [Service] ITopicEventSender eventSender)
    {
        var invoice = await invoiceService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnInvoiceCreated), invoice);
        return invoice;
    }

    [GraphQLDescription("Update an existing invoice")]
    public async Task<Invoice?> UpdateInvoice(
        Guid id,
        UpdateInvoiceInput input,
        [Service] IInvoiceService invoiceService,
        [Service] ITopicEventSender eventSender)
    {
        var invoice = await invoiceService.UpdateAsync(id, input);
        if (invoice != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnInvoiceUpdated), invoice);
        }
        return invoice;
    }

    [GraphQLDescription("Update invoice status")]
    public async Task<Invoice?> UpdateInvoiceStatus(
        Guid id,
        InvoiceStatus status,
        [Service] IInvoiceService invoiceService,
        [Service] ITopicEventSender eventSender)
    {
        var invoice = await invoiceService.UpdateStatusAsync(id, status);
        if (invoice != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnInvoiceUpdated), invoice);
            await eventSender.SendAsync(nameof(Subscription.OnInvoiceStatusChanged), invoice);
        }
        return invoice;
    }

    [GraphQLDescription("Cancel an invoice")]
    public async Task<Invoice?> CancelInvoice(
        Guid id,
        string? reason,
        [Service] IInvoiceService invoiceService,
        [Service] ITopicEventSender eventSender)
    {
        var invoice = await invoiceService.CancelAsync(id, reason);
        if (invoice != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnInvoiceStatusChanged), invoice);
        }
        return invoice;
    }

    // Journal Entry Mutations
    [GraphQLDescription("Create a new journal entry")]
    public async Task<JournalEntry> CreateJournalEntry(
        CreateJournalEntryInput input,
        [Service] IJournalEntryService journalEntryService,
        [Service] ITopicEventSender eventSender)
    {
        var entry = await journalEntryService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnJournalEntryCreated), entry);
        return entry;
    }

    [GraphQLDescription("Post a journal entry")]
    public async Task<JournalEntry?> PostJournalEntry(
        Guid id,
        [Service] IJournalEntryService journalEntryService,
        [Service] ITopicEventSender eventSender)
    {
        var entry = await journalEntryService.PostAsync(id);
        if (entry != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnJournalEntryPosted), entry);
        }
        return entry;
    }

    [GraphQLDescription("Reverse a journal entry")]
    public async Task<JournalEntry?> ReverseJournalEntry(
        Guid id,
        string? reason,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.ReverseEntryAsync(id, reason);
    }

    [GraphQLDescription("Void a journal entry")]
    public async Task<bool> VoidJournalEntry(
        Guid id,
        string? reason,
        [Service] IJournalEntryService journalEntryService)
    {
        return await journalEntryService.VoidAsync(id, reason);
    }

    // Payment Record Mutations
    [GraphQLDescription("Create a payment record")]
    public async Task<PaymentRecord> CreatePaymentRecord(
        CreatePaymentRecordInput input,
        [Service] IPaymentRecordService paymentRecordService,
        [Service] ITopicEventSender eventSender)
    {
        var payment = await paymentRecordService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnPaymentCreated), payment);
        return payment;
    }

    [GraphQLDescription("Confirm a payment record")]
    public async Task<PaymentRecord?> ConfirmPaymentRecord(
        Guid id,
        [Service] IPaymentRecordService paymentRecordService,
        [Service] ITopicEventSender eventSender)
    {
        var payment = await paymentRecordService.ConfirmAsync(id);
        if (payment != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnPaymentConfirmed), payment);
        }
        return payment;
    }

    [GraphQLDescription("Void a payment record")]
    public async Task<PaymentRecord?> VoidPaymentRecord(
        Guid id,
        string? reason,
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.VoidAsync(id, reason);
    }

    [GraphQLDescription("Refund a payment")]
    public async Task<PaymentRecord?> RefundPayment(
        Guid id,
        decimal amount,
        string? reason,
        [Service] IPaymentRecordService paymentRecordService)
    {
        return await paymentRecordService.RefundAsync(id, amount, reason);
    }

    // Bank Account Mutations
    [GraphQLDescription("Create a bank account")]
    public async Task<BankAccount> CreateBankAccount(
        CreateBankAccountInput input,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.CreateAsync(input);
    }

    [GraphQLDescription("Update a bank account")]
    public async Task<BankAccount?> UpdateBankAccount(
        Guid id,
        UpdateBankAccountInput input,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Deactivate a bank account")]
    public async Task<bool> DeactivateBankAccount(
        Guid id,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.DeactivateAsync(id);
    }

    [GraphQLDescription("Record a bank transaction")]
    public async Task<BankTransaction> RecordBankTransaction(
        CreateBankTransactionInput input,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.RecordTransactionAsync(input);
    }

    [GraphQLDescription("Reconcile bank account")]
    public async Task<BankReconciliation?> ReconcileBankAccount(
        Guid bankAccountId,
        CreateReconciliationInput input,
        [Service] IBankAccountService bankAccountService)
    {
        return await bankAccountService.ReconcileAsync(bankAccountId, input);
    }

    // Tax Rate Mutations
    [GraphQLDescription("Create a tax rate")]
    public async Task<TaxRate> CreateTaxRate(
        CreateTaxRateInput input,
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        var taxRate = new TaxRate
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Code = input.Code,
            Rate = input.Rate,
            Description = input.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.TaxRates.Add(taxRate);
        await context.SaveChangesAsync();

        return taxRate;
    }

    [GraphQLDescription("Update a tax rate")]
    public async Task<TaxRate?> UpdateTaxRate(
        Guid id,
        UpdateTaxRateInput input,
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        var taxRate = await context.TaxRates.FindAsync(id);
        if (taxRate == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            taxRate.Name = input.Name;

        if (input.Rate.HasValue)
            taxRate.Rate = input.Rate.Value;

        if (!string.IsNullOrEmpty(input.Description))
            taxRate.Description = input.Description;

        if (input.IsActive.HasValue)
            taxRate.IsActive = input.IsActive.Value;

        taxRate.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return taxRate;
    }

    // Fiscal Period Mutations
    [GraphQLDescription("Create a fiscal period")]
    public async Task<FiscalPeriod> CreateFiscalPeriod(
        CreateFiscalPeriodInput input,
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        var period = new FiscalPeriod
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            StartDate = input.StartDate,
            EndDate = input.EndDate,
            Year = input.FiscalYear,
            Period = input.Period,
            Status = FiscalPeriodStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        context.FiscalPeriods.Add(period);
        await context.SaveChangesAsync();

        return period;
    }

    [GraphQLDescription("Close a fiscal period")]
    public async Task<FiscalPeriod?> CloseFiscalPeriod(
        Guid id,
        [Service] AccountingService.Data.AccountingDbContext context)
    {
        var period = await context.FiscalPeriods.FindAsync(id);
        if (period == null) return null;

        period.Status = FiscalPeriodStatus.Closed;
        period.ClosedAt = DateTime.UtcNow;
        period.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return period;
    }
}

// Input types for Tax and Fiscal Period
public record CreateTaxRateInput(
    string Name,
    string Code,
    decimal Rate,
    string? Description
);

public record UpdateTaxRateInput(
    string? Name,
    decimal? Rate,
    string? Description,
    bool? IsActive
);

public record CreateFiscalPeriodInput(
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    int FiscalYear,
    int Period
);
