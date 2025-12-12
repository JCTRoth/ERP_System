using AccountingService.Models;

namespace AccountingService.GraphQL;

public class Subscription
{
    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new invoice creation events")]
    public Invoice OnInvoiceCreated([EventMessage] Invoice invoice) => invoice;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to invoice update events")]
    public Invoice OnInvoiceUpdated([EventMessage] Invoice invoice) => invoice;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to invoice status change events")]
    public Invoice OnInvoiceStatusChanged([EventMessage] Invoice invoice) => invoice;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new journal entry creation events")]
    public JournalEntry OnJournalEntryCreated([EventMessage] JournalEntry entry) => entry;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to journal entry posting events")]
    public JournalEntry OnJournalEntryPosted([EventMessage] JournalEntry entry) => entry;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new payment creation events")]
    public PaymentRecord OnPaymentCreated([EventMessage] PaymentRecord payment) => payment;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to payment confirmation events")]
    public PaymentRecord OnPaymentConfirmed([EventMessage] PaymentRecord payment) => payment;
}
