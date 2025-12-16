using Microsoft.EntityFrameworkCore;
using AccountingService.Models;

namespace AccountingService.Data;

public class AccountingDbContext : DbContext
{
    public AccountingDbContext(DbContextOptions<AccountingDbContext> options) : base(options) { }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLineItem> InvoiceLineItems => Set<InvoiceLineItem>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<BankTransaction> BankTransactions => Set<BankTransaction>();
    public DbSet<BankReconciliation> BankReconciliations => Set<BankReconciliation>();
    public DbSet<BankReconciliationLine> BankReconciliationLines => Set<BankReconciliationLine>();
    public DbSet<TaxRate> TaxRates => Set<TaxRate>();
    public DbSet<FiscalPeriod> FiscalPeriods => Set<FiscalPeriod>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Account configuration
        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("accounts");
            entity.HasIndex(e => e.AccountNumber).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AccountNumber).HasColumnName("account_number");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.ParentAccountId).HasColumnName("parent_account_id");
            entity.Property(e => e.Balance).HasColumnName("balance");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsSystemAccount).HasColumnName("is_system_account");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.ParentAccount)
                  .WithMany(a => a.ChildAccounts)
                  .HasForeignKey(e => e.ParentAccountId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Invoice configuration
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasIndex(e => e.InvoiceNumber).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.InvoiceNumber).HasColumnName("invoice_number");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.SupplierId).HasColumnName("supplier_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.OrderNumber).HasColumnName("order_number");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name");
            entity.Property(e => e.SupplierName).HasColumnName("supplier_name");
            entity.Property(e => e.BillingAddress).HasColumnName("billing_address");
            entity.Property(e => e.BillingCity).HasColumnName("billing_city");
            entity.Property(e => e.BillingPostalCode).HasColumnName("billing_postal_code");
            entity.Property(e => e.BillingCountry).HasColumnName("billing_country");
            entity.Property(e => e.VatNumber).HasColumnName("vat_number");
            entity.Property(e => e.IssueDate).HasColumnName("issue_date");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.PaidDate).HasColumnName("paid_date");
            entity.Property(e => e.Subtotal).HasColumnName("subtotal");
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount");
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.AmountPaid).HasColumnName("amount_paid");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.InternalNotes).HasColumnName("internal_notes");
            entity.Property(e => e.PaymentTerms).HasColumnName("payment_terms");
            entity.Property(e => e.JournalEntryId).HasColumnName("journal_entry_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.Ignore(e => e.AmountDue);
        });

        // InvoiceLineItem configuration
        modelBuilder.Entity<InvoiceLineItem>(entity =>
        {
            entity.ToTable("invoice_line_items");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.LineNumber).HasColumnName("line_number");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Sku).HasColumnName("sku");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Unit).HasColumnName("unit");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price");
            entity.Property(e => e.DiscountAmount).HasColumnName("discount_amount");
            entity.Property(e => e.DiscountPercent).HasColumnName("discount_percent");
            entity.Property(e => e.TaxRate).HasColumnName("tax_rate");
            entity.Property(e => e.TaxAmount).HasColumnName("tax_amount");
            entity.Property(e => e.Total).HasColumnName("total");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Invoice)
                  .WithMany(i => i.LineItems)
                  .HasForeignKey(e => e.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // JournalEntry configuration
        modelBuilder.Entity<JournalEntry>(entity =>
        {
            entity.ToTable("journal_entries");
            entity.HasIndex(e => e.EntryNumber).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EntryNumber).HasColumnName("entry_number");
            entity.Property(e => e.EntryDate).HasColumnName("entry_date");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.TotalDebit).HasColumnName("total_debit");
            entity.Property(e => e.TotalCredit).HasColumnName("total_credit");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.PaymentId).HasColumnName("payment_id");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.IsReversing).HasColumnName("is_reversing");
            entity.Property(e => e.ReversedEntryId).HasColumnName("reversed_entry_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // JournalEntryLine configuration
        modelBuilder.Entity<JournalEntryLine>(entity =>
        {
            entity.ToTable("journal_entry_lines");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.JournalEntryId).HasColumnName("journal_entry_id");
            entity.Property(e => e.LineNumber).HasColumnName("line_number");
            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DebitAmount).HasColumnName("debit_amount");
            entity.Property(e => e.CreditAmount).HasColumnName("credit_amount");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.JournalEntry)
                  .WithMany(j => j.Lines)
                  .HasForeignKey(e => e.JournalEntryId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Account)
                  .WithMany(a => a.JournalEntryLines)
                  .HasForeignKey(e => e.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // PaymentRecord configuration
        modelBuilder.Entity<PaymentRecord>(entity =>
        {
            entity.ToTable("payment_records");
            entity.HasIndex(e => e.PaymentNumber).IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PaymentNumber).HasColumnName("payment_number");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.BankAccountId).HasColumnName("bank_account_id");
            entity.Property(e => e.Method).HasColumnName("method");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date");
            entity.Property(e => e.ClearedDate).HasColumnName("cleared_date");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PayerName).HasColumnName("payer_name");
            entity.Property(e => e.PayeeName).HasColumnName("payee_name");
            entity.Property(e => e.PayerIban).HasColumnName("payer_iban");
            entity.Property(e => e.PayeeIban).HasColumnName("payee_iban");
            entity.Property(e => e.JournalEntryId).HasColumnName("journal_entry_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Invoice)
                  .WithMany(i => i.Payments)
                  .HasForeignKey(e => e.InvoiceId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // BankAccount configuration
        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity.ToTable("bank_accounts");
            entity.HasIndex(e => e.Iban);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.BankName).HasColumnName("bank_name");
            entity.Property(e => e.AccountNumber).HasColumnName("account_number");
            entity.Property(e => e.Iban).HasColumnName("iban");
            entity.Property(e => e.Bic).HasColumnName("bic");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.CurrentBalance).HasColumnName("current_balance");
            entity.Property(e => e.AvailableBalance).HasColumnName("available_balance");
            entity.Property(e => e.LastSyncedAt).HasColumnName("last_synced_at");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // BankTransaction configuration
        modelBuilder.Entity<BankTransaction>(entity =>
        {
            entity.ToTable("bank_transactions");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BankAccountId).HasColumnName("bank_account_id");
            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");
            entity.Property(e => e.ValueDate).HasColumnName("value_date");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.CounterpartyName).HasColumnName("counterparty_name");
            entity.Property(e => e.CounterpartyIban).HasColumnName("counterparty_iban");
            entity.Property(e => e.BalanceAfter).HasColumnName("balance_after");
            entity.Property(e => e.IsReconciled).HasColumnName("is_reconciled");
            entity.Property(e => e.MatchedPaymentId).HasColumnName("matched_payment_id");
            entity.Property(e => e.JournalEntryId).HasColumnName("journal_entry_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.BankAccount)
                  .WithMany(b => b.Transactions)
                  .HasForeignKey(e => e.BankAccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TaxRate configuration
        modelBuilder.Entity<TaxRate>(entity =>
        {
            entity.ToTable("tax_rates");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Code).HasColumnName("code");
            entity.Property(e => e.Rate).HasColumnName("rate");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.EffectiveFrom).HasColumnName("effective_from");
            entity.Property(e => e.EffectiveUntil).HasColumnName("effective_until");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        // FiscalPeriod configuration
        modelBuilder.Entity<FiscalPeriod>(entity =>
        {
            entity.ToTable("fiscal_periods");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Year).HasColumnName("year");
            entity.Property(e => e.Period).HasColumnName("period");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.ClosedAt).HasColumnName("closed_at");
            entity.Property(e => e.ClosedByUserId).HasColumnName("closed_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // Seed data
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Seed default chart of accounts
        var cashId = Guid.Parse("a0000000-0000-0000-0000-000000000001");
        var bankId = Guid.Parse("a0000000-0000-0000-0000-000000000002");
        var arId = Guid.Parse("a0000000-0000-0000-0000-000000000003");
        var apId = Guid.Parse("a0000000-0000-0000-0000-000000000004");
        var revenueId = Guid.Parse("a0000000-0000-0000-0000-000000000005");
        var cogsId = Guid.Parse("a0000000-0000-0000-0000-000000000006");
        var expenseId = Guid.Parse("a0000000-0000-0000-0000-000000000007");

        modelBuilder.Entity<Account>().HasData(
            new Account
            {
                Id = cashId,
                AccountNumber = "1000",
                Name = "Cash",
                Type = AccountType.Asset,
                Category = AccountCategory.Cash,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 1,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = bankId,
                AccountNumber = "1100",
                Name = "Bank Account",
                Type = AccountType.Asset,
                Category = AccountCategory.BankAccount,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 2,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = arId,
                AccountNumber = "1200",
                Name = "Accounts Receivable",
                Type = AccountType.Asset,
                Category = AccountCategory.AccountsReceivable,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 3,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = apId,
                AccountNumber = "2000",
                Name = "Accounts Payable",
                Type = AccountType.Liability,
                Category = AccountCategory.AccountsPayable,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 10,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = revenueId,
                AccountNumber = "4000",
                Name = "Sales Revenue",
                Type = AccountType.Revenue,
                Category = AccountCategory.Sales,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 20,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = cogsId,
                AccountNumber = "5000",
                Name = "Cost of Goods Sold",
                Type = AccountType.Expense,
                Category = AccountCategory.CostOfGoodsSold,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 30,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = expenseId,
                AccountNumber = "6000",
                Name = "Operating Expenses",
                Type = AccountType.Expense,
                Category = AccountCategory.OperatingExpenses,
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 40,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed default tax rates
        modelBuilder.Entity<TaxRate>().HasData(
            new TaxRate
            {
                Id = Guid.Parse("b0000000-0000-0000-0000-000000000001"),
                Name = "Standard VAT",
                Code = "VAT19",
                Rate = 0.19m,
                Type = TaxType.VAT,
                Country = "DE",
                IsDefault = true,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new TaxRate
            {
                Id = Guid.Parse("b0000000-0000-0000-0000-000000000002"),
                Name = "Reduced VAT",
                Code = "VAT7",
                Rate = 0.07m,
                Type = TaxType.VAT,
                Country = "DE",
                IsDefault = false,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new TaxRate
            {
                Id = Guid.Parse("b0000000-0000-0000-0000-000000000003"),
                Name = "Zero Rate",
                Code = "VAT0",
                Rate = 0m,
                Type = TaxType.VAT,
                Country = "DE",
                IsDefault = false,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
