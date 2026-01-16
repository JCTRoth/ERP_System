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
    bool IsActive,
    string? AccountCode
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
    DateTime? InvoiceDate,
    DateTime DueDate,
    decimal? TaxRate,
    string? Notes,
    string? PaymentTerms,
    string Currency,
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
    decimal? DiscountPercent,
    decimal TaxRate
);

public record UpdateInvoiceStatusInput(
    Guid InvoiceId,
    string Status,
    string? InternalNotes
);

public record UpdateInvoiceInput(
    Guid Id,
    string? Type,
    Guid? CustomerId,
    Guid? SupplierId,
    string? CustomerName,
    string? SupplierName,
    string? BillingAddress,
    string? BillingCity,
    string? BillingPostalCode,
    string? BillingCountry,
    string? VatNumber,
    DateTime? IssueDate,
    DateTime? DueDate,
    decimal? TaxRate,
    string? Notes,
    string? PaymentTerms,
    List<UpdateInvoiceLineItemInput>? LineItems
);

public record UpdateInvoiceLineItemInput(
    Guid Id,
    string? Description,
    string? Sku,
    Guid? ProductId,
    Guid? AccountId,
    int? Quantity,
    string? Unit,
    decimal? UnitPrice,
    decimal? DiscountPercent,
    decimal? TaxRate
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
    string? Notes,
    string? PaymentMethod,
    string? ReferenceNumber
);

public record UpdatePaymentRecordInput(
    Guid Id,
    string? Type,
    Guid? InvoiceId,
    Guid? BankAccountId,
    string? Method,
    decimal? Amount,
    string? Currency,
    DateTime? PaymentDate,
    string? Reference,
    string? PayerName,
    string? PayeeName,
    string? PayerIban,
    string? PayeeIban,
    string? Notes,
    string? PaymentMethod,
    string? ReferenceNumber
);
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
    Guid? AccountId,
    string? AccountName,
    string? RoutingNumber,
    string? SwiftCode,
    decimal? OpeningBalance,
    Guid? GlAccountId
);

public record UpdateBankAccountInput(
    Guid Id,
    string? Name,
    string? BankName,
    string? AccountNumber,
    string? Iban,
    string? Bic,
    string? Currency,
    string? Type,
    bool? IsActive,
    bool? IsPrimary,
    string? AccountName,
    string? RoutingNumber,
    string? SwiftCode,
    Guid? GlAccountId
);

public record CreateBankTransactionInput(
    Guid BankAccountId,
    string Type,
    decimal Amount,
    string? Description,
    DateTime? TransactionDate,
    string? Reference,
    Guid? RelatedInvoiceId,
    Guid? RelatedPaymentId,
    string? CheckNumber,
    Guid? PaymentRecordId
);

public record CreateReconciliationInput(
    Guid BankAccountId,
    DateTime StartDate,
    DateTime EndDate,
    decimal OpeningBalance,
    decimal ClosingBalance,
    List<ReconciliationLineInput> Transactions,
    List<Guid>? TransactionIds,
    DateTime? StatementDate,
    decimal? StatementEndingBalance,
    string? Notes,
    string? ReconciledBy
);

public record ReconciliationLineInput(
    Guid TransactionId,
    bool IsReconciled
);

// Reporting DTOs
public record BalanceSheetDto(
    DateTime AsOf,
    decimal TotalAssets,
    decimal TotalLiabilities,
    decimal TotalEquity,
    List<BalanceSheetLineDto> Assets,
    List<BalanceSheetLineDto> Liabilities,
    List<BalanceSheetLineDto> Equity
);

public record BalanceSheetLineDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Balance
);

public record IncomeStatementDto(
    DateTime From,
    DateTime To,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetIncome,
    List<IncomeStatementLineDto> Revenue,
    List<IncomeStatementLineDto> Expenses
);

public record IncomeStatementLineDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Amount
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

public record CashFlowStatementDto(
    DateTime From,
    DateTime To,
    decimal OperatingCashFlow,
    decimal InvestingCashFlow,
    decimal FinancingCashFlow,
    decimal NetCashFlow,
    List<CashFlowItemDto> OperatingActivities,
    List<CashFlowItemDto> InvestingActivities,
    List<CashFlowItemDto> FinancingActivities
);

public record AccountStatementDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    DateTime From,
    DateTime To,
    decimal OpeningBalance,
    decimal ClosingBalance,
    List<AccountTransactionDto> Transactions
);

public record AccountTransactionDto(
    DateTime Date,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Balance
);

public record AccountStatementLineDto(
    DateTime Date,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Balance
);

public record AgingReportDto(
    DateTime AsOf,
    List<AgingBucketDto> Buckets
);

public record AgingBucketDto(
    string Range,
    int DaysOverdue,
    decimal Amount,
    int InvoiceCount
);

public record CashFlowItemDto(
    string Description,
    decimal Amount
);

public record CashFlowLineDto(
    string Description,
    decimal Amount
);
