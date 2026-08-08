using Microsoft.EntityFrameworkCore;
using AccountingService.Models;
using AccountingService.Services;

namespace AccountingService.Data;

public class AccountingDbContext : DbContext
{
    private readonly Guid? _companyId;

    public static readonly Guid DemoCompanyId = Guid.Parse("ae161374-7185-4aa5-97f4-bcb35cf0ae19");

    public AccountingDbContext(DbContextOptions<AccountingDbContext> options, ICompanyContext companyContext) : base(options)
    {
        _companyId = companyContext.CurrentCompanyId;
    }

    /// <summary>Design-time constructor (migrations)</summary>
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

    public override int SaveChanges()
    {
        StampCompanyId();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampCompanyId();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void StampCompanyId()
    {
        if (_companyId == null) return;
        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added))
        {
            var prop = entry.Metadata.FindProperty("CompanyId");
            if (prop != null && entry.Property("CompanyId").CurrentValue is Guid g && g == Guid.Empty)
            {
                entry.Property("CompanyId").CurrentValue = _companyId.Value;
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Account configuration
        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("accounts");
            entity.HasIndex(e => e.AccountNumber).IsUnique();
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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

        // Configure one-to-one relationship between Invoice and JournalEntry
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.JournalEntry)
            .WithOne(j => j.Invoice)
            .HasForeignKey<JournalEntry>(j => j.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure one-to-one relationship between PaymentRecord and JournalEntry
        modelBuilder.Entity<PaymentRecord>()
            .HasOne(p => p.JournalEntry)
            .WithOne(j => j.Payment)
            .HasForeignKey<JournalEntry>(j => j.PaymentId)
            .OnDelete(DeleteBehavior.SetNull);

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
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.PaymentNumber).HasColumnName("payment_number");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.InvoiceId).HasColumnName("invoice_id");
            entity.Property(e => e.BankAccountId).HasColumnName("bank_account_id");
            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.Method).HasColumnName("method");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.RefundedAmount).HasColumnName("refunded_amount");
            entity.Property(e => e.IsRefund).HasColumnName("is_refund");
            entity.Property(e => e.OriginalPaymentId).HasColumnName("original_payment_id");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date");
            entity.Property(e => e.ClearedDate).HasColumnName("cleared_date");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.ReferenceNumber).HasColumnName("reference_number");
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

            entity.HasOne(e => e.Account)
                  .WithMany()
                  .HasForeignKey(e => e.AccountId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // BankAccount configuration
        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity.ToTable("bank_accounts");
            entity.HasIndex(e => e.Iban);
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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
            entity.HasIndex(e => e.CompanyId);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
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
        // Demo document dates are computed relative to the current date so the seeded
        // data always stays fresh (recent invoices, current due dates, recent payments).
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        // Seed default chart of accounts
        var cashId = Guid.Parse("a0000000-0000-0000-0000-000000000001");
        var bankId = Guid.Parse("a0000000-0000-0000-0000-000000000002");
        var arId = Guid.Parse("a0000000-0000-0000-0000-000000000003");
        var apId = Guid.Parse("a0000000-0000-0000-0000-000000000004");
        var revenueId = Guid.Parse("a0000000-0000-0000-0000-000000000005");
        var cogsId = Guid.Parse("a0000000-0000-0000-0000-000000000006");
        var expenseId = Guid.Parse("a0000000-0000-0000-0000-000000000007");
        var equityId = Guid.Parse("a0000000-0000-0000-0000-000000000008");

        // Balances reflect all seeded journal entry lines (including opening balance entries).
        // Asset/Expense: balance = sum(debit) - sum(credit)
        // Liability/Equity/Revenue: balance = sum(credit) - sum(debit)
        modelBuilder.Entity<Account>().HasData(
            new Account
            {
                Id = cashId,
                CompanyId = DemoCompanyId,
                AccountNumber = "1000",
                Name = "Cash",
                Type = AccountType.Asset,
                Category = AccountCategory.Cash,
                Balance = 24550.00m, // 25000 opening - 450 write-off
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 1,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = bankId,
                CompanyId = DemoCompanyId,
                AccountNumber = "1100",
                Name = "Bank Account",
                Type = AccountType.Asset,
                Category = AccountCategory.BankAccount,
                Balance = 14650.00m, // 25000 opening + 450 payments - 2500 rent Jan - 2500 rent Feb - 5800 supplier
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 2,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = arId,
                CompanyId = DemoCompanyId,
                AccountNumber = "1200",
                Name = "Accounts Receivable",
                Type = AccountType.Asset,
                Category = AccountCategory.AccountsReceivable,
                Balance = 204.50m, // 654.50 invoiced - 450 received
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 3,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = apId,
                CompanyId = DemoCompanyId,
                AccountNumber = "2000",
                Name = "Accounts Payable",
                Type = AccountType.Liability,
                Category = AccountCategory.AccountsPayable,
                Balance = 0.00m, // 5800 purchase - 5800 paid
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 10,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = equityId,
                CompanyId = DemoCompanyId,
                AccountNumber = "3000",
                Name = "Owner's Equity",
                Type = AccountType.Equity,
                Category = AccountCategory.Capital,
                Balance = 50000.00m, // Initial capital
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 15,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = revenueId,
                CompanyId = DemoCompanyId,
                AccountNumber = "4000",
                Name = "Sales Revenue",
                Type = AccountType.Revenue,
                Category = AccountCategory.Sales,
                Balance = 654.50m, // 238 + 178.50 + 238
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 20,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = cogsId,
                CompanyId = DemoCompanyId,
                AccountNumber = "5000",
                Name = "Cost of Goods Sold",
                Type = AccountType.Expense,
                Category = AccountCategory.CostOfGoodsSold,
                Balance = 6250.00m, // 450 write-off + 5800 purchase
                IsActive = true,
                IsSystemAccount = true,
                SortOrder = 30,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Account
            {
                Id = expenseId,
                CompanyId = DemoCompanyId,
                AccountNumber = "6000",
                Name = "Operating Expenses",
                Type = AccountType.Expense,
                Category = AccountCategory.OperatingExpenses,
                Balance = 5000.00m, // 2500 rent Jan + 2500 rent Feb
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
                CompanyId = DemoCompanyId,
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
                CompanyId = DemoCompanyId,
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
                CompanyId = DemoCompanyId,
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

        //
        // TEST / DEMO DATA
        //

        var invoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000001");
        var invoiceLine1 = Guid.Parse("c0000000-0000-0000-0000-000000000011");
        var invoiceLine2 = Guid.Parse("c0000000-0000-0000-0000-000000000012");
        var paymentId = Guid.Parse("c0000000-0000-0000-0000-000000000021");

        modelBuilder.Entity<Invoice>().HasData(
            new Invoice
            {
                Id = invoiceId,
                CompanyId = DemoCompanyId,
                InvoiceNumber = "INV-2026-0001",
                Type = InvoiceType.SalesInvoice,
                Status = InvoiceStatus.Sent,
                CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"),
                SupplierId = null,
                OrderId = null,
                OrderNumber = null,
                CustomerName = "Jonas R",
                SupplierName = null,
                BillingAddress = "Hauptstrasse 12",
                BillingCity = "Hamburg",
                BillingPostalCode = "20354",
                BillingCountry = "DE",
                VatNumber = "DE999999999",
                IssueDate = today.AddDays(-60),
                DueDate = today.AddDays(-30),
                PaidDate = null,
                Subtotal = 200.00m,
                TaxAmount = 38.00m,
                TaxRate = 0.19m,
                DiscountAmount = 0.00m,
                Total = 238.00m,
                AmountPaid = 100.00m,
                Currency = "EUR",
                Notes = "Thank you for your purchase.",
                InternalNotes = "Seeded test invoice - linked to Jonas R",
                PaymentTerms = "Net 30",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-60)
            }
        );

        modelBuilder.Entity<InvoiceLineItem>().HasData(
            new InvoiceLineItem
            {
                Id = invoiceLine1,
                InvoiceId = invoiceId,
                LineNumber = 1,
                Description = "Product A",
                Sku = "PROD-A-001",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                AccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005"),
                Quantity = 2,
                Unit = "pcs",
                UnitPrice = 50.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 19.00m,
                Total = 119.00m,
                CreatedAt = today.AddDays(-60)
            },
            new InvoiceLineItem
            {
                Id = invoiceLine2,
                InvoiceId = invoiceId,
                LineNumber = 2,
                Description = "Product B",
                Sku = "PROD-B-002",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000002"),
                AccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005"),
                Quantity = 1,
                Unit = "pcs",
                UnitPrice = 100.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 19.00m,
                Total = 119.00m,
                CreatedAt = today.AddDays(-60)
            }
        );

        modelBuilder.Entity<PaymentRecord>().HasData(
            new PaymentRecord
            {
                Id = paymentId,
                CompanyId = DemoCompanyId,
                PaymentNumber = "PAY-2026-0001",
                Type = PaymentRecordType.CustomerPayment,
                Status = PaymentRecordStatus.Completed,
                InvoiceId = invoiceId,
                BankAccountId = null,
                Method = PaymentMethod.BankTransfer,
                Amount = 100.00m,
                Currency = "EUR",
                PaymentDate = today.AddDays(-55),
                ClearedDate = today.AddDays(-54),
                Reference = "PAYREF123",
                TransactionId = "TX123456",
                Notes = "Partial payment",
                PayerName = "Jonas R",
                PayeeName = "ACME Corp",
                PayerIban = "DE89370400440532013000",
                PayeeIban = "DE75512108001245126199",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-55)
            },
            new PaymentRecord
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000022"),
                CompanyId = DemoCompanyId,
                PaymentNumber = "PAY-2026-0002",
                Type = PaymentRecordType.CustomerPayment,
                Status = PaymentRecordStatus.Completed,
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000002"),
                BankAccountId = null,
                Method = PaymentMethod.CreditCard,
                Amount = 150.00m,
                Currency = "EUR",
                PaymentDate = today.AddDays(-40),
                ClearedDate = today.AddDays(-40),
                Reference = "CC-2026-001",
                TransactionId = "TX789012",
                Notes = "Credit card payment",
                PayerName = "Sarah Mitchell",
                PayeeName = "ACME Corp",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-40)
            },
            new PaymentRecord
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000023"),
                CompanyId = DemoCompanyId,
                PaymentNumber = "PAY-2026-0003",
                Type = PaymentRecordType.CustomerPayment,
                Status = PaymentRecordStatus.Completed,
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000003"),
                BankAccountId = null,
                Method = PaymentMethod.BankTransfer,
                Amount = 200.00m,
                Currency = "EUR",
                PaymentDate = today.AddDays(-35),
                ClearedDate = today.AddDays(-34),
                Reference = "PAYREF456",
                TransactionId = "TX345678",
                Notes = "Full payment",
                PayerName = "Robert Johnson",
                PayeeName = "ACME Corp",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-35)
            }
        );

        // Seed additional invoices
        modelBuilder.Entity<Invoice>().HasData(
            new Invoice
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000002"),
                CompanyId = DemoCompanyId,
                InvoiceNumber = "INV-2026-0002",
                Type = InvoiceType.SalesInvoice,
                Status = InvoiceStatus.Sent,
                CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48c"),
                SupplierId = null,
                OrderId = null,
                OrderNumber = null,
                CustomerName = "Sarah Mitchell",
                SupplierName = null,
                BillingAddress = "123 Health Plaza",
                BillingCity = "Boston",
                BillingPostalCode = "02101",
                BillingCountry = "USA",
                VatNumber = null,
                IssueDate = today.AddDays(-45),
                DueDate = today.AddDays(-15),
                PaidDate = today.AddDays(-40),
                Subtotal = 150.00m,
                TaxAmount = 28.50m,
                TaxRate = 0.19m,
                DiscountAmount = 0.00m,
                Total = 178.50m,
                AmountPaid = 150.00m,
                Currency = "EUR",
                Notes = "Invoice for pharmaceutical supplies.",
                InternalNotes = "Seeded invoice for Sarah Mitchell - MediVita",
                PaymentTerms = "Net 30",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-45)
            },
            new Invoice
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000003"),
                CompanyId = DemoCompanyId,
                InvoiceNumber = "INV-2026-0003",
                Type = InvoiceType.SalesInvoice,
                Status = InvoiceStatus.Sent,
                CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48b"),
                SupplierId = null,
                OrderId = null,
                OrderNumber = null,
                CustomerName = "Robert Johnson",
                SupplierName = null,
                BillingAddress = "456 Medical Center Dr",
                BillingCity = "Chicago",
                BillingPostalCode = "60601",
                BillingCountry = "USA",
                VatNumber = null,
                IssueDate = today.AddDays(-40),
                DueDate = today.AddDays(-10),
                PaidDate = today.AddDays(-35),
                Subtotal = 200.00m,
                TaxAmount = 38.00m,
                TaxRate = 0.19m,
                DiscountAmount = 0.00m,
                Total = 238.00m,
                AmountPaid = 200.00m,
                Currency = "EUR",
                Notes = "Wellness pharmacy supplies.",
                InternalNotes = "Seeded invoice for Robert Johnson - WellnessRx",
                PaymentTerms = "Net 30",
                JournalEntryId = null,
                CreatedAt = today.AddDays(-40)
            }
        );

        // Seed invoice line items for additional invoices
        modelBuilder.Entity<InvoiceLineItem>().HasData(
            // INV-2026-0002 line items
            new InvoiceLineItem
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000024"),
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000002"),
                LineNumber = 1,
                Description = "Cardio Supplement Package",
                Sku = "CARD-PKG-001",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                AccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005"), // revenue
                Quantity = 3,
                Unit = "box",
                UnitPrice = 50.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 28.50m,
                Total = 178.50m,
                CreatedAt = today.AddDays(-45)
            },
            // INV-2026-0003 line items
            new InvoiceLineItem
            {
                Id = Guid.Parse("c0000000-0000-0000-0000-000000000025"),
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000003"),
                LineNumber = 1,
                Description = "Wellness Supplies - Monthly Pack",
                Sku = "WELL-PACK-001",
                ProductId = Guid.Parse("40000000-0000-0000-0000-000000000002"),
                AccountId = Guid.Parse("a0000000-0000-0000-0000-000000000005"), // revenue
                Quantity = 4,
                Unit = "pack",
                UnitPrice = 50.00m,
                DiscountAmount = 0.00m,
                DiscountPercent = 0.00m,
                TaxRate = 0.19m,
                TaxAmount = 38.00m,
                Total = 238.00m,
                CreatedAt = today.AddDays(-40)
            }
        );

        // ---- Journal Entries (bookings) ----
        // IDs for journal entries
        var je1Id = Guid.Parse("d0000000-0000-0000-0000-000000000001");
        var je2Id = Guid.Parse("d0000000-0000-0000-0000-000000000002");
        var je3Id = Guid.Parse("d0000000-0000-0000-0000-000000000003");
        var je4Id = Guid.Parse("d0000000-0000-0000-0000-000000000004");
        var je5Id = Guid.Parse("d0000000-0000-0000-0000-000000000005");
        var je6Id = Guid.Parse("d0000000-0000-0000-0000-000000000006");
        var je7Id = Guid.Parse("d0000000-0000-0000-0000-000000000007");
        var je8Id = Guid.Parse("d0000000-0000-0000-0000-000000000008");
        var je9Id = Guid.Parse("d0000000-0000-0000-0000-000000000009");
        var je10Id = Guid.Parse("d0000000-0000-0000-0000-000000000010");
        var jeOpeningId = Guid.Parse("d0000000-0000-0000-0000-000000000100");
        var jePurchaseId = Guid.Parse("d0000000-0000-0000-0000-000000000101");

        modelBuilder.Entity<JournalEntry>().HasData(
            // JE-Opening: Opening balance - initial company capital
            new JournalEntry
            {
                Id = jeOpeningId,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2025-0001",
                EntryDate = today.AddMonths(-8),
                Description = "Opening balance - initial company capital",
                Reference = "OPENING-2025",
                Type = JournalEntryType.Standard,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 50000.00m,
                TotalCredit = 50000.00m,
                Currency = "EUR",
                CreatedAt = today.AddMonths(-8)
            },
            // JE-Purchase: Purchase from PharmaChem (creates AP, matched by JE10 payment)
            new JournalEntry
            {
                Id = jePurchaseId,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0011",
                EntryDate = today.AddDays(-30),
                Description = "Purchase order - PharmaChem Industries quarterly supplies",
                Reference = "PO-2026-Q1",
                Type = JournalEntryType.Standard,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 5800.00m,
                TotalCredit = 5800.00m,
                Currency = "EUR",
                CreatedAt = today.AddDays(-30)
            },
            // JE1: Sales invoice INV-2026-0001 (Jonas R - €238.00)
            new JournalEntry
            {
                Id = je1Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0001",
                EntryDate = today.AddDays(-60),
                Description = "Sales invoice INV-2026-0001 - Jonas R",
                Reference = "INV-2026-0001",
                Type = JournalEntryType.Sales,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 238.00m,
                TotalCredit = 238.00m,
                Currency = "EUR",
                InvoiceId = invoiceId, // c0000000-...-0001
                CreatedAt = today.AddDays(-60)
            },
            // JE2: Sales invoice INV-2026-0002 (Sarah Mitchell - €178.50)
            new JournalEntry
            {
                Id = je2Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0002",
                EntryDate = today.AddDays(-45),
                Description = "Sales invoice INV-2026-0002 - Sarah Mitchell",
                Reference = "INV-2026-0002",
                Type = JournalEntryType.Sales,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 178.50m,
                TotalCredit = 178.50m,
                Currency = "EUR",
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000002"),
                CreatedAt = today.AddDays(-45)
            },
            // JE3: Sales invoice INV-2026-0003 (Robert Johnson - €238.00)
            new JournalEntry
            {
                Id = je3Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0003",
                EntryDate = today.AddDays(-40),
                Description = "Sales invoice INV-2026-0003 - Robert Johnson",
                Reference = "INV-2026-0003",
                Type = JournalEntryType.Sales,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 238.00m,
                TotalCredit = 238.00m,
                Currency = "EUR",
                InvoiceId = Guid.Parse("c0000000-0000-0000-0000-000000000003"),
                CreatedAt = today.AddDays(-40)
            },
            // JE4: Payment PAY-2026-0001 (Jonas R - €100.00 partial)
            new JournalEntry
            {
                Id = je4Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0004",
                EntryDate = today.AddDays(-55),
                Description = "Payment received PAY-2026-0001 - Jonas R",
                Reference = "PAY-2026-0001",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 100.00m,
                TotalCredit = 100.00m,
                Currency = "EUR",
                PaymentId = paymentId, // c0000000-...-0021
                CreatedAt = today.AddDays(-55)
            },
            // JE5: Payment PAY-2026-0002 (Sarah Mitchell - €150.00)
            new JournalEntry
            {
                Id = je5Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0005",
                EntryDate = today.AddDays(-40),
                Description = "Payment received PAY-2026-0002 - Sarah Mitchell",
                Reference = "PAY-2026-0002",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 150.00m,
                TotalCredit = 150.00m,
                Currency = "EUR",
                PaymentId = Guid.Parse("c0000000-0000-0000-0000-000000000022"),
                CreatedAt = today.AddDays(-40)
            },
            // JE6: Payment PAY-2026-0003 (Robert Johnson - €200.00)
            new JournalEntry
            {
                Id = je6Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0006",
                EntryDate = today.AddDays(-35),
                Description = "Payment received PAY-2026-0003 - Robert Johnson",
                Reference = "PAY-2026-0003",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 200.00m,
                TotalCredit = 200.00m,
                Currency = "EUR",
                PaymentId = Guid.Parse("c0000000-0000-0000-0000-000000000023"),
                CreatedAt = today.AddDays(-35)
            },
            // JE7: Adjusting entry - inventory adjustment
            new JournalEntry
            {
                Id = je7Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0007",
                EntryDate = today.AddDays(-30),
                Description = "Inventory adjustment - expired pharmaceutical stock write-off",
                Reference = "ADJ-2026-001",
                Type = JournalEntryType.Adjusting,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 450.00m,
                TotalCredit = 450.00m,
                Currency = "EUR",
                CreatedAt = today.AddDays(-30)
            },
            // JE8: Standard entry - office rent
            new JournalEntry
            {
                Id = je8Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0008",
                EntryDate = today.AddMonths(-2),
                Description = "Monthly office rent - January 2026",
                Reference = "RENT-2026-01",
                Type = JournalEntryType.Standard,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 2500.00m,
                TotalCredit = 2500.00m,
                Currency = "EUR",
                CreatedAt = today.AddMonths(-2)
            },
            // JE9: Standard entry - office rent Feb
            new JournalEntry
            {
                Id = je9Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0009",
                EntryDate = today.AddMonths(-1),
                Description = "Monthly office rent - February 2026",
                Reference = "RENT-2026-02",
                Type = JournalEntryType.Standard,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 2500.00m,
                TotalCredit = 2500.00m,
                Currency = "EUR",
                CreatedAt = today.AddMonths(-1)
            },
            // JE10: Recent - supplier payment
            new JournalEntry
            {
                Id = je10Id,
                CompanyId = DemoCompanyId,
                EntryNumber = "JE-2026-0010",
                EntryDate = today.AddDays(-15),
                Description = "Supplier payment - PharmaChem Industries quarterly order",
                Reference = "SUPPAY-2026-Q1",
                Type = JournalEntryType.Payment,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 5800.00m,
                TotalCredit = 5800.00m,
                Currency = "EUR",
                CreatedAt = today.AddDays(-15)
            }
        );

        // ---- Journal Entry Lines (double-entry bookkeeping) ----
        modelBuilder.Entity<JournalEntryLine>().HasData(
            // JE1: INV-2026-0001 → Debit AR, Credit Revenue
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000001"), JournalEntryId = je1Id, LineNumber = 1, AccountId = arId, Description = "Accounts Receivable - INV-2026-0001", DebitAmount = 238.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 5, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000002"), JournalEntryId = je1Id, LineNumber = 2, AccountId = revenueId, Description = "Sales Revenue - INV-2026-0001", DebitAmount = 0, CreditAmount = 238.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 5, 0, 0, 0, DateTimeKind.Utc) },

            // JE2: INV-2026-0002 → Debit AR, Credit Revenue
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000003"), JournalEntryId = je2Id, LineNumber = 1, AccountId = arId, Description = "Accounts Receivable - INV-2026-0002", DebitAmount = 178.50m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 6, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000004"), JournalEntryId = je2Id, LineNumber = 2, AccountId = revenueId, Description = "Sales Revenue - INV-2026-0002", DebitAmount = 0, CreditAmount = 178.50m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 6, 0, 0, 0, DateTimeKind.Utc) },

            // JE3: INV-2026-0003 → Debit AR, Credit Revenue
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000005"), JournalEntryId = je3Id, LineNumber = 1, AccountId = arId, Description = "Accounts Receivable - INV-2026-0003", DebitAmount = 238.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 7, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000006"), JournalEntryId = je3Id, LineNumber = 2, AccountId = revenueId, Description = "Sales Revenue - INV-2026-0003", DebitAmount = 0, CreditAmount = 238.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 7, 0, 0, 0, DateTimeKind.Utc) },

            // JE4: PAY-2026-0001 → Debit Bank, Credit AR
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000007"), JournalEntryId = je4Id, LineNumber = 1, AccountId = bankId, Description = "Bank deposit - PAY-2026-0001", DebitAmount = 100.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000008"), JournalEntryId = je4Id, LineNumber = 2, AccountId = arId, Description = "Accounts Receivable - PAY-2026-0001", DebitAmount = 0, CreditAmount = 100.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc) },

            // JE5: PAY-2026-0002 → Debit Bank, Credit AR
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000009"), JournalEntryId = je5Id, LineNumber = 1, AccountId = bankId, Description = "Bank deposit - PAY-2026-0002", DebitAmount = 150.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 12, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000010"), JournalEntryId = je5Id, LineNumber = 2, AccountId = arId, Description = "Accounts Receivable - PAY-2026-0002", DebitAmount = 0, CreditAmount = 150.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 12, 0, 0, 0, DateTimeKind.Utc) },

            // JE6: PAY-2026-0003 → Debit Bank, Credit AR
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000011"), JournalEntryId = je6Id, LineNumber = 1, AccountId = bankId, Description = "Bank deposit - PAY-2026-0003", DebitAmount = 200.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 13, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000012"), JournalEntryId = je6Id, LineNumber = 2, AccountId = arId, Description = "Accounts Receivable - PAY-2026-0003", DebitAmount = 0, CreditAmount = 200.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 13, 0, 0, 0, DateTimeKind.Utc) },

            // JE7: Inventory adjustment → Debit COGS, Credit Expense (write-off)
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000013"), JournalEntryId = je7Id, LineNumber = 1, AccountId = cogsId, Description = "Expired stock write-off", DebitAmount = 450.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000014"), JournalEntryId = je7Id, LineNumber = 2, AccountId = cashId, Description = "Inventory reduction - expired stock", DebitAmount = 0, CreditAmount = 450.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc) },

            // JE8: Office rent Jan → Debit Expense, Credit Bank
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000015"), JournalEntryId = je8Id, LineNumber = 1, AccountId = expenseId, Description = "Office rent - January 2026", DebitAmount = 2500.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000016"), JournalEntryId = je8Id, LineNumber = 2, AccountId = bankId, Description = "Bank payment - office rent Jan", DebitAmount = 0, CreditAmount = 2500.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc) },

            // JE9: Office rent Feb → Debit Expense, Credit Bank
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000017"), JournalEntryId = je9Id, LineNumber = 1, AccountId = expenseId, Description = "Office rent - February 2026", DebitAmount = 2500.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 2, 28, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000018"), JournalEntryId = je9Id, LineNumber = 2, AccountId = bankId, Description = "Bank payment - office rent Feb", DebitAmount = 0, CreditAmount = 2500.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 2, 28, 0, 0, 0, DateTimeKind.Utc) },

            // JE10: Supplier payment → Debit AP, Credit Bank
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000019"), JournalEntryId = je10Id, LineNumber = 1, AccountId = apId, Description = "Supplier payment - PharmaChem Industries", DebitAmount = 5800.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 4, 15, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000020"), JournalEntryId = je10Id, LineNumber = 2, AccountId = bankId, Description = "Bank payment - PharmaChem Q1 order", DebitAmount = 0, CreditAmount = 5800.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 4, 15, 0, 0, 0, DateTimeKind.Utc) },

            // JE-Opening: Opening balance → Debit Cash + Bank, Credit Equity
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000021"), JournalEntryId = jeOpeningId, LineNumber = 1, AccountId = cashId, Description = "Opening balance - Cash", DebitAmount = 25000.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2025, 12, 1, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000022"), JournalEntryId = jeOpeningId, LineNumber = 2, AccountId = bankId, Description = "Opening balance - Bank", DebitAmount = 25000.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2025, 12, 1, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000023"), JournalEntryId = jeOpeningId, LineNumber = 3, AccountId = equityId, Description = "Owner's Equity - initial capital", DebitAmount = 0, CreditAmount = 50000.00m, Currency = "EUR", CreatedAt = new DateTime(2025, 12, 1, 0, 0, 0, DateTimeKind.Utc) },

            // JE-Purchase: Purchase from PharmaChem → Debit COGS, Credit AP
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000024"), JournalEntryId = jePurchaseId, LineNumber = 1, AccountId = cogsId, Description = "PharmaChem quarterly supplies", DebitAmount = 5800.00m, CreditAmount = 0, Currency = "EUR", CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc) },
            new JournalEntryLine { Id = Guid.Parse("d1000000-0000-0000-0000-000000000025"), JournalEntryId = jePurchaseId, LineNumber = 2, AccountId = apId, Description = "Accounts Payable - PharmaChem Industries", DebitAmount = 0, CreditAmount = 5800.00m, Currency = "EUR", CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
