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
        [Service] IInvoiceService invoiceService)
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

        if (payment.InvoiceId.HasValue)
        {
            await invoiceService.RecordPaymentAsync(payment.InvoiceId.Value, payment.Amount, payment.Reference);
        }

        return payment;
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
