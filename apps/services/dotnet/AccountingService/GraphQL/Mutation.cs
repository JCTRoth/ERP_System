using AccountingService.Models;
using AccountingService.Services;
using AccountingService.DTOs;
using AccountingService.Data;
using HotChocolate.Subscriptions;
using Microsoft.EntityFrameworkCore;

namespace AccountingService.GraphQL;

public class Mutation
{
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

    [GraphQLDescription("Create a new payment record")]
    public async Task<PaymentRecord> CreatePaymentRecord(
        CreatePaymentRecordInput input,
        [Service] AccountingDbContext context,
        [Service] IInvoiceService invoiceService,
        [Service] IJournalEntryService journalEntryService)
    {
        var payment = new PaymentRecord
        {
            Id = Guid.NewGuid(),
            PaymentNumber = await GeneratePaymentNumberAsync(context),
            Type = TryParseEnum<global::AccountingService.Models.PaymentRecordType>(
                input.Type,
                global::AccountingService.Models.PaymentRecordType.CustomerPayment),
            InvoiceId = input.InvoiceId,
            BankAccountId = input.BankAccountId,
            AccountId = input.AccountId,
            Method = TryParsePaymentMethod(input.Method ?? input.PaymentMethod),
            Amount = input.Amount,
            Currency = string.IsNullOrWhiteSpace(input.Currency) ? "EUR" : input.Currency!,
            PaymentDate = input.PaymentDate ?? DateTime.UtcNow,
            Reference = input.Reference ?? input.ReferenceNumber,
            PayerName = input.PayerName,
            PayeeName = input.PayeeName,
            PayerIban = input.PayerIban,
            PayeeIban = input.PayeeIban,
            Notes = input.Notes,
            Status = PaymentRecordStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };

        context.PaymentRecords.Add(payment);
        await context.SaveChangesAsync();

        // Create and post the corresponding journal entry so that
        // cash/bank and AR/AP balances reflect this payment.
        // Determine invoice and whether this is a receivable (customer) payment.
        Invoice? invoice = null;
        if (payment.InvoiceId.HasValue)
        {
            invoice = await invoiceService.GetByIdAsync(payment.InvoiceId.Value);
        }

        var isReceivable = (invoice != null && invoice.Type.ToString() == "SalesInvoice")
            || payment.Type.ToString() == "CustomerPayment";

        // Determine cash/bank account (from input accountId if provided,
        // otherwise fall back to the seeded Cash account 1000).
        Account cashAccount;
        if (payment.AccountId.HasValue)
        {
            cashAccount = await context.Accounts
                .FirstAsync(a => a.Id == payment.AccountId.Value);
        }
        else
        {
            cashAccount = await context.Accounts
                .FirstAsync(a => a.AccountNumber == "1000");
            payment.AccountId = cashAccount.Id;
        }

        // Determine offset account: AR (1200) for customer/receivable payments,
        // AP (2000) otherwise.
        Account offsetAccount;
        if (isReceivable)
        {
            offsetAccount = await context.Accounts
                .FirstAsync(a => a.AccountNumber == "1200");
        }
        else
        {
            offsetAccount = await context.Accounts
                .FirstAsync(a => a.AccountNumber == "2000");
        }

        var lines = new List<CreateJournalEntryLineInput>();

        if (payment.Amount > 0)
        {
            if (isReceivable)
            {
                // Customer payment: Debit Cash/Bank, Credit AR
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
                // Vendor payment: Debit AP, Credit Cash/Bank
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
        else if (payment.Amount < 0)
        {
            // Refunds: reverse the entries using the absolute amount.
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

        if (lines.Count > 0)
        {
            var journalEntry = await journalEntryService.CreateAsync(new CreateJournalEntryInput(
                payment.PaymentDate,
                $"Payment: {payment.PaymentNumber}",
                payment.PaymentNumber,
                "Payment",
                null,
                payment.Id,
                lines
            ));

            payment.JournalEntryId = journalEntry.Id;

            // Post the journal entry to update account balances
            await journalEntryService.PostAsync(journalEntry.Id);

            await context.SaveChangesAsync();
        }

        if (payment.InvoiceId.HasValue)
        {
            await invoiceService.RecordPaymentAsync(payment.InvoiceId.Value, payment.Amount, payment.Reference);
        }

        return payment;
    }

    [GraphQLDescription("Update an existing payment record")]
    public async Task<PaymentRecord> UpdatePaymentRecord(
        UpdatePaymentRecordInput input,
        [Service] AccountingDbContext context)
    {
        var payment = await context.PaymentRecords.FindAsync(input.Id);
        if (payment == null)
        {
            throw new GraphQLException($"Payment record with ID {input.Id} not found");
        }

        // Update fields if provided
        if (input.Type != null)
        {
            payment.Type = TryParseEnum<global::AccountingService.Models.PaymentRecordType>(
                input.Type, payment.Type);
        }
        if (input.InvoiceId.HasValue)
        {
            payment.InvoiceId = input.InvoiceId;
        }
        if (input.BankAccountId.HasValue)
        {
            payment.BankAccountId = input.BankAccountId;
        }
        if (input.AccountId.HasValue)
        {
            payment.AccountId = input.AccountId;
        }
        if (input.Method != null || input.PaymentMethod != null)
        {
            payment.Method = TryParsePaymentMethod(input.Method ?? input.PaymentMethod);
        }
        if (input.Amount.HasValue)
        {
            payment.Amount = input.Amount.Value;
        }
        if (input.Currency != null)
        {
            payment.Currency = input.Currency;
        }
        if (input.PaymentDate.HasValue)
        {
            payment.PaymentDate = input.PaymentDate.Value;
        }
        if (input.Reference != null || input.ReferenceNumber != null)
        {
            payment.Reference = input.Reference ?? input.ReferenceNumber;
        }
        if (input.PayerName != null)
        {
            payment.PayerName = input.PayerName;
        }
        if (input.PayeeName != null)
        {
            payment.PayeeName = input.PayeeName;
        }
        if (input.PayerIban != null)
        {
            payment.PayerIban = input.PayerIban;
        }
        if (input.PayeeIban != null)
        {
            payment.PayeeIban = input.PayeeIban;
        }
        if (input.Notes != null)
        {
            payment.Notes = input.Notes;
        }

        payment.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return payment;
    }

    [GraphQLDescription("Create a new account")]
    public async Task<Account> CreateAccount(
        CreateAccountInput input,
        [Service] IAccountService accountService)
    {
        return await accountService.CreateAsync(input);
    }

    [GraphQLDescription("Update an existing account")]
    public async Task<Account> UpdateAccount(
        Guid id,
        UpdateAccountInput input,
        [Service] IAccountService accountService)
    {
        var account = await accountService.UpdateAsync(id, input);
        if (account == null)
        {
            throw new GraphQLException($"Account with ID {id} not found");
        }
        return account;
    }

    [GraphQLDescription("Delete a payment record")]
    public async Task<bool> DeletePaymentRecord(
        Guid id,
        [Service] AccountingDbContext context,
        [Service] IInvoiceService invoiceService)
    {
        var payment = await context.PaymentRecords.FindAsync(id);
        if (payment == null)
        {
            throw new GraphQLException($"Payment record with ID {id} not found");
        }

        // If this payment was linked to an invoice, we need to reverse the payment amount
        if (payment.InvoiceId.HasValue)
        {
            await invoiceService.RecordPaymentAsync(payment.InvoiceId.Value, -payment.Amount, $"Reversal: {payment.Reference}");
        }

        context.PaymentRecords.Remove(payment);
        await context.SaveChangesAsync();

        return true;
    }

    private static PaymentMethod TryParsePaymentMethod(string? method)
    {
        if (!string.IsNullOrWhiteSpace(method) &&
            Enum.TryParse<PaymentMethod>(method, true, out var parsed))
        {
            return parsed;
        }

        return PaymentMethod.Other;
    }

    private static TEnum TryParseEnum<TEnum>(string? value, TEnum @default) where TEnum : struct, Enum
    {
        if (!string.IsNullOrWhiteSpace(value) && Enum.TryParse<TEnum>(value, true, out var parsed))
        {
            return parsed;
        }

        return @default;
    }

    private static async Task<string> GeneratePaymentNumberAsync(AccountingDbContext context)
    {
        var date = DateTime.UtcNow;
        var prefix = $"PAY-{date:yyyyMM}";

        var lastPayment = await context.PaymentRecords
            .Where(p => p.PaymentNumber.StartsWith(prefix))
            .OrderByDescending(p => p.PaymentNumber)
            .FirstOrDefaultAsync();

        var sequence = 1;
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
