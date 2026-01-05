using AccountingService.Models;
using AccountingService.Services;
using AccountingService.DTOs;
using HotChocolate.Subscriptions;

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
}
