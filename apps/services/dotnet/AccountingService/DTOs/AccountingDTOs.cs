namespace AccountingService.DTOs;

// Account DTOs
public record AccountDto(
    Guid Id,
    string AccountNumber,
    string Name,
    string? Description,
    string Type,
    string Category,
    Guid? ParentAccountId,
    decimal Balance,
    string Currency,
    bool IsActive,
    bool IsSystemAccount,
    DateTime CreatedAt
);

public record CreateAccountInput(
    string AccountNumber,
    string Name,
    string? Description,
    string Type,
    string Category,
    Guid? ParentAccountId,
    string Currency,
    bool IsActive
);

public record UpdateAccountInput(
    Guid Id,
    string? Name,
    string? Description,
    string? Category,
    Guid? ParentAccountId,
    bool? IsActive
);

// Invoice DTOs
public record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    string Type,
    string Status,
    Guid? CustomerId,
    Guid? SupplierId,
    string? CustomerName,
    string? SupplierName,
    DateTime IssueDate,
    DateTime DueDate,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    decimal AmountPaid,
    decimal AmountDue,
    string Currency,
    DateTime CreatedAt
);

public record CreateInvoiceInput(
    string Type,
    Guid? CustomerId,
    Guid? SupplierId,
    Guid? OrderId,
    string? OrderNumber,
    string? CustomerName,
    string? SupplierName,
    string? BillingAddress,
    string? BillingCity,
    string? BillingPostalCode,
    string? BillingCountry,
    string? VatNumber,
    DateTime? IssueDate,
    DateTime DueDate,
    decimal TaxRate,
    string? Notes,
    string? PaymentTerms,
    List<CreateInvoiceLineItemInput> LineItems
);

public record CreateInvoiceLineItemInput(
    string Description,
    string? Sku,
    Guid? ProductId,
    Guid? AccountId,
    int Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal DiscountPercent,
    decimal TaxRate
);

public record UpdateInvoiceStatusInput(
    Guid InvoiceId,
    string Status,
    string? InternalNotes
);

// Journal Entry DTOs
public record JournalEntryDto(
    Guid Id,
    string EntryNumber,
    DateTime EntryDate,
    string? Description,
    string? Reference,
    string Type,
    string Status,
    decimal TotalDebit,
    decimal TotalCredit,
    string Currency,
    DateTime CreatedAt
);

public record CreateJournalEntryInput(
    DateTime? EntryDate,
    string? Description,
    string? Reference,
    string Type,
    Guid? InvoiceId,
    Guid? PaymentId,
    List<CreateJournalEntryLineInput> Lines
);

public record CreateJournalEntryLineInput(
    Guid AccountId,
    string? Description,
    decimal DebitAmount,
    decimal CreditAmount
);

// Payment DTOs
public record PaymentRecordDto(
    Guid Id,
    string PaymentNumber,
    string Type,
    string Status,
    Guid? InvoiceId,
    Guid? BankAccountId,
    string Method,
    decimal Amount,
    string Currency,
    DateTime PaymentDate,
    string? Reference,
    DateTime CreatedAt
);

public record CreatePaymentRecordInput(
    string Type,
    Guid? InvoiceId,
    Guid? BankAccountId,
    string Method,
    decimal Amount,
    string Currency,
    DateTime? PaymentDate,
    string? Reference,
    string? PayerName,
    string? PayeeName,
    string? PayerIban,
    string? PayeeIban,
    string? Notes
);

// Bank Account DTOs
public record BankAccountDto(
    Guid Id,
    string Name,
    string? BankName,
    string? Iban,
    string? Bic,
    string Currency,
    decimal CurrentBalance,
    decimal AvailableBalance,
    string Type,
    bool IsActive,
    bool IsPrimary,
    DateTime CreatedAt
);

public record CreateBankAccountInput(
    string Name,
    string? BankName,
    string? AccountNumber,
    string? Iban,
    string? Bic,
    string Currency,
    string Type,
    decimal InitialBalance,
    bool IsPrimary,
    Guid? AccountId
);

// Reporting DTOs
public record BalanceSheetDto(
    DateTime AsOf,
    decimal TotalAssets,
    decimal TotalLiabilities,
    decimal TotalEquity,
    List<AccountBalanceDto> Assets,
    List<AccountBalanceDto> Liabilities,
    List<AccountBalanceDto> Equity
);

public record IncomeStatementDto(
    DateTime From,
    DateTime To,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetIncome,
    List<AccountBalanceDto> Revenue,
    List<AccountBalanceDto> Expenses
);

public record AccountBalanceDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Balance
);

public record TrialBalanceDto(
    DateTime AsOf,
    decimal TotalDebits,
    decimal TotalCredits,
    List<TrialBalanceLineDto> Lines
);

public record TrialBalanceLineDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Debit,
    decimal Credit
);

public record CashFlowDto(
    DateTime From,
    DateTime To,
    decimal BeginningCash,
    decimal EndingCash,
    decimal NetChange,
    List<CashFlowItemDto> Operating,
    List<CashFlowItemDto> Investing,
    List<CashFlowItemDto> Financing
);

public record CashFlowItemDto(
    string Description,
    decimal Amount
);
