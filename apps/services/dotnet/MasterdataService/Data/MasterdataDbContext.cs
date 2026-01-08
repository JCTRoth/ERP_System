using Microsoft.EntityFrameworkCore;
using MasterdataService.Models;

namespace MasterdataService.Data;

public class MasterdataDbContext : DbContext
{
    public MasterdataDbContext(DbContextOptions<MasterdataDbContext> options) : base(options) { }

    // Customer and Supplier
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<BankDetail> BankDetails => Set<BankDetail>();

    // Employee and Organization
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<CostCenter> CostCenters => Set<CostCenter>();
    public DbSet<BusinessLocation> Locations => Set<BusinessLocation>();

    // Assets
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetCategory> AssetCategories => Set<AssetCategory>();

    // Reference Data
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<PaymentTerm> PaymentTerms => Set<PaymentTerm>();
    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();
    public DbSet<TaxCode> TaxCodes => Set<TaxCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Customer configuration
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasIndex(e => e.CustomerNumber).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasMany(e => e.Addresses)
                .WithOne(a => a.Customer)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Contacts)
                .WithOne(c => c.Customer)
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.BankDetails)
                .WithOne(b => b.Customer)
                .HasForeignKey(b => b.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Supplier configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasIndex(e => e.SupplierNumber).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasMany(e => e.Addresses)
                .WithOne(a => a.Supplier)
                .HasForeignKey(a => a.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Contacts)
                .WithOne(c => c.Supplier)
                .HasForeignKey(c => c.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.BankDetails)
                .WithOne(b => b.Supplier)
                .HasForeignKey(b => b.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Employee configuration
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasIndex(e => e.EmployeeNumber).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasOne(e => e.Manager)
                .WithMany(e => e.DirectReports)
                .HasForeignKey(e => e.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Addresses)
                .WithOne(a => a.Employee)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Department configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.ParentDepartment)
                .WithMany(e => e.SubDepartments)
                .HasForeignKey(e => e.ParentDepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Manager)
                .WithMany()
                .HasForeignKey(e => e.ManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // CostCenter configuration
        modelBuilder.Entity<CostCenter>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.ParentCostCenter)
                .WithMany(e => e.SubCostCenters)
                .HasForeignKey(e => e.ParentCostCenterId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ResponsiblePerson)
                .WithOne()
                .HasForeignKey<CostCenter>(e => e.ResponsiblePersonId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Location configuration
        modelBuilder.Entity<BusinessLocation>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.ParentLocation)
                .WithMany(e => e.SubLocations)
                .HasForeignKey(e => e.ParentLocationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Asset configuration
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasIndex(e => e.AssetNumber).IsUnique();
            entity.HasIndex(e => e.SerialNumber);
            entity.HasIndex(e => e.Barcode);
        });

        // AssetCategory configuration
        modelBuilder.Entity<AssetCategory>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.ParentCategory)
                .WithMany(e => e.SubCategories)
                .HasForeignKey(e => e.ParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Currency configuration
        modelBuilder.Entity<Currency>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // PaymentTerm configuration
        modelBuilder.Entity<PaymentTerm>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // UnitOfMeasure configuration
        modelBuilder.Entity<UnitOfMeasure>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.BaseUnit)
                .WithMany()
                .HasForeignKey(e => e.BaseUnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // TaxCode configuration
        modelBuilder.Entity<TaxCode>(entity =>
        {
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // Seed default currencies
        modelBuilder.Entity<Currency>().HasData(
            new Currency { Id = Guid.NewGuid(), Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2, ExchangeRate = 1, IsBaseCurrency = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new Currency { Id = Guid.NewGuid(), Code = "EUR", Name = "Euro", Symbol = "€", DecimalPlaces = 2, ExchangeRate = 0.85m, IsBaseCurrency = false, IsActive = true, CreatedAt = DateTime.UtcNow },
            new Currency { Id = Guid.NewGuid(), Code = "GBP", Name = "British Pound", Symbol = "£", DecimalPlaces = 2, ExchangeRate = 0.73m, IsBaseCurrency = false, IsActive = true, CreatedAt = DateTime.UtcNow },
            new Currency { Id = Guid.NewGuid(), Code = "JPY", Name = "Japanese Yen", Symbol = "¥", DecimalPlaces = 0, ExchangeRate = 110m, IsBaseCurrency = false, IsActive = true, CreatedAt = DateTime.UtcNow }
        );

        // Seed default payment terms
        modelBuilder.Entity<PaymentTerm>().HasData(
            new PaymentTerm { Id = Guid.NewGuid(), Code = "NET30", Name = "Net 30", Description = "Payment due within 30 days", DueDays = 30, Type = PaymentTermType.Net, IsActive = true, CreatedAt = DateTime.UtcNow },
            new PaymentTerm { Id = Guid.NewGuid(), Code = "NET60", Name = "Net 60", Description = "Payment due within 60 days", DueDays = 60, Type = PaymentTermType.Net, IsActive = true, CreatedAt = DateTime.UtcNow },
            new PaymentTerm { Id = Guid.NewGuid(), Code = "NET90", Name = "Net 90", Description = "Payment due within 90 days", DueDays = 90, Type = PaymentTermType.Net, IsActive = true, CreatedAt = DateTime.UtcNow },
            new PaymentTerm { Id = Guid.NewGuid(), Code = "DOR", Name = "Due on Receipt", Description = "Payment due immediately", DueDays = 0, Type = PaymentTermType.DueOnReceipt, IsActive = true, CreatedAt = DateTime.UtcNow },
            new PaymentTerm { Id = Guid.NewGuid(), Code = "2%10NET30", Name = "2% 10 Net 30", Description = "2% discount if paid within 10 days, otherwise net 30", DueDays = 30, DiscountPercent = 2, DiscountDays = 10, Type = PaymentTermType.Net, IsActive = true, CreatedAt = DateTime.UtcNow }
        );

        // Seed default units of measure
        modelBuilder.Entity<UnitOfMeasure>().HasData(
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "EA", Name = "Each", Symbol = "ea", Type = UomType.Unit, IsBaseUnit = true, ConversionFactor = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "KG", Name = "Kilogram", Symbol = "kg", Type = UomType.Weight, IsBaseUnit = true, ConversionFactor = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "LB", Name = "Pound", Symbol = "lb", Type = UomType.Weight, IsBaseUnit = false, ConversionFactor = 0.453592m, IsActive = true, CreatedAt = DateTime.UtcNow },
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "M", Name = "Meter", Symbol = "m", Type = UomType.Length, IsBaseUnit = true, ConversionFactor = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "L", Name = "Liter", Symbol = "L", Type = UomType.Volume, IsBaseUnit = true, ConversionFactor = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new UnitOfMeasure { Id = Guid.NewGuid(), Code = "HR", Name = "Hour", Symbol = "hr", Type = UomType.Time, IsBaseUnit = true, ConversionFactor = 1, IsActive = true, CreatedAt = DateTime.UtcNow }
        );

        // Seed default tax codes
        modelBuilder.Entity<TaxCode>().HasData(
            new TaxCode { Id = Guid.NewGuid(), Code = "STD", Name = "Standard Rate", Description = "Standard sales tax", Rate = 10m, Type = TaxType.Sales, IsActive = true, IsDefault = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.NewGuid(), Code = "REDUCED", Name = "Reduced Rate", Description = "Reduced sales tax", Rate = 5m, Type = TaxType.Sales, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.NewGuid(), Code = "ZERO", Name = "Zero Rate", Description = "Zero-rated", Rate = 0m, Type = TaxType.Sales, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.NewGuid(), Code = "EXEMPT", Name = "Exempt", Description = "Tax exempt", Rate = 0m, Type = TaxType.Exempt, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow }
        );

        //
        // Demo Data
        //

        // Seed sample customers for development (use fixed GUID so other seeds can reference)
        modelBuilder.Entity<Customer>().HasData(
            new Customer
            {
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"),
                CustomerNumber = "CUST-000001",
                Name = "Jonas Roth",
                LegalName = "Mailbase.info",
                ContactPerson = "Jonas Roth",
                Email = "jonas.roth@mailbase.info",
                Phone = "+1-555-0101",
                Website = "https://www.mailbase.info",
                TaxId = "DE123456789",
                CreditLimit = 50000m,
                Status = CustomerStatus.Active,
                CreatedAt = DateTime.UtcNow
            }
        );

        // Seed example suppliers
        modelBuilder.Entity<Supplier>().HasData(
            new Supplier
            {
                Id = Guid.Parse("6a2f2e9e-8548-431f-9f03-9186942bb48f"),
                SupplierNumber = "SUPP-0001",
                Name = "ACME Supplies",
                ContactPerson = "Jane Supplier",
                Email = "supplier@acme.example",
                Phone = "+1-555-0202",
                Status = SupplierStatus.Active,
                CreatedAt = DateTime.UtcNow
            }
        );

        // Seed address/contact/bank for supplier (models use separate tables)
        modelBuilder.Entity<Address>().HasData(
            new Address { Id = Guid.Parse("9d2f2e9e-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("6a2f2e9e-8548-431f-9f03-9186942bb48f"), AddressLine1 = "456 Supplier Lane", City = "Supply City", PostalCode = "54321", Country = "DE", IsDefault = true, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Contact>().HasData(
            new Contact { Id = Guid.Parse("9e2f2e9e-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("6a2f2e9e-8548-431f-9f03-9186942bb48f"), FirstName = "Jane", LastName = "Supplier", Email = "supplier@acme.example", Phone = "+1-555-0202", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<BankDetail>().HasData(
            new BankDetail { Id = Guid.Parse("9f2f2e9e-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("6a2f2e9e-8548-431f-9f03-9186942bb48f"), BankName = "Acme Bank", Iban = "DE89370400440532013001", SwiftCode = "ACMEDEFFXXX", CreatedAt = DateTime.UtcNow }
        );

        // Seed example department, cost center and location
        modelBuilder.Entity<Department>().HasData(
            new Department { Id = Guid.Parse("70000000-0000-0000-0000-000000000001"), Code = "SALES", Name = "Sales", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<CostCenter>().HasData(
            new CostCenter { Id = Guid.Parse("70000000-0000-0000-0000-000000000002"), Code = "CC-100", Name = "Main Cost Center", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<BusinessLocation>().HasData(
            new BusinessLocation { Id = Guid.Parse("70000000-0000-0000-0000-000000000003"), Code = "HQ", Name = "Headquarters", CreatedAt = DateTime.UtcNow }
        );

        // Seed example employee
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = Guid.Parse("8a2f2e9e-8548-431f-9f03-9186942bb48f"), EmployeeNumber = "EMP-0001", FirstName = "Alice", LastName = "Admin", Email = "alice.admin@example.com", CreatedAt = DateTime.UtcNow }
        );

        // Seed a sample address, contact and bank detail linked to customer
        modelBuilder.Entity<Address>().HasData(
            new Address { Id = Guid.Parse("9a2f2e9e-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), AddressLine1 = "123 Demo Street", City = "Demo City", PostalCode = "12345", Country = "DE", IsDefault = true, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Contact>().HasData(
            new Contact { Id = Guid.Parse("9b2f2e9e-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), FirstName = "John", LastName = "Doe", Email = "john.doe@example.com", Phone = "+1-555-0123", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<BankDetail>().HasData(
            new BankDetail { Id = Guid.Parse("9c2f2e9e-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), BankName = "Demo Bank", Iban = "DE89370400440532013000", SwiftCode = "DEUTDEDBXXX", CreatedAt = DateTime.UtcNow }
        );

        // Seed example asset category and asset
        modelBuilder.Entity<AssetCategory>().HasData(
            new AssetCategory { Id = Guid.Parse("80000000-0000-0000-0000-000000000001"), Code = "IT", Name = "IT Equipment", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Asset>().HasData(
            new Asset { Id = Guid.Parse("80000000-0000-0000-0000-000000000011"), AssetNumber = "ASSET-0001", Name = "Laptop Demo", CategoryId = Guid.Parse("80000000-0000-0000-0000-000000000001"), CreatedAt = DateTime.UtcNow }
        );
    }
}
