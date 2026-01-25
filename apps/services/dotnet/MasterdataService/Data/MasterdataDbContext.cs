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
            new TaxCode { Id = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "STD", Name = "Standard Rate", Description = "Standard sales tax (19%)", Rate = 19m, Type = TaxType.Sales, IsActive = true, IsDefault = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "REDUCED", Name = "Reduced Rate", Description = "Reduced sales tax (7%)", Rate = 7m, Type = TaxType.Sales, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "REDUCED2", Name = "Reduced Rate 2", Description = "Reduced sales tax (16%)", Rate = 16m, Type = TaxType.Sales, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.Parse("a4c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "ZERO", Name = "Zero Rate", Description = "Zero-rated (0%)", Rate = 0m, Type = TaxType.Sales, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            new TaxCode { Id = Guid.Parse("b5c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "EXEMPT", Name = "Exempt", Description = "Tax exempt", Rate = 0m, Type = TaxType.Exempt, IsActive = true, EffectiveFrom = DateTime.UtcNow, CreatedAt = DateTime.UtcNow }
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
            new Address { Id = Guid.Parse("9a2f2e9e-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), AddressLine1 = "123 Demo Street", City = "Demo City", PostalCode = "12345", Country = "DE", IsDefault = true, CreatedAt = DateTime.UtcNow },
            new Address { Id = Guid.Parse("9a2f2e9e-8548-431f-9f03-9186942bb49f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), Type = AddressType.Shipping, AddressLine1 = "456 Shipping Lane", AddressLine2 = "Suite 200", City = "Shipping City", PostalCode = "67890", Country = "DE", IsDefault = false, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Contact>().HasData(
            new Contact { Id = Guid.Parse("9b2f2e9e-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), FirstName = "Jonas", LastName = "Roth", Email = "jonas.roth@example.com", Phone = "+1-555-0123", CreatedAt = DateTime.UtcNow }
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

        //
        // MediVita Pharmaceutical Company Data
        //

        // MediVita as Customer (for purchasing supplies/equipment)
        modelBuilder.Entity<Customer>().HasData(
            new Customer
            {
                Id = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"),
                CustomerNumber = "CUST-MEDIVITA",
                Name = "MediVita Pharmaceuticals",
                LegalName = "MediVita Pharmaceuticals Inc.",
                Type = CustomerType.Business,
                ContactPerson = "Dr. Sarah Johnson",
                Email = "procurement@medivita.com",
                Phone = "+1-555-123-4567",
                Website = "https://www.medivita.com",
                TaxId = "US-MED-123456789",
                DefaultCurrencyId = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f"), // USD
                DefaultPaymentTermId = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), // NET30
                CreditLimit = 250000m,
                Status = CustomerStatus.Active,
                CreatedAt = DateTime.UtcNow
            }
        );

        // MediVita as Supplier (for selling pharmaceutical products)
        modelBuilder.Entity<Supplier>().HasData(
            new Supplier
            {
                Id = Guid.Parse("b1c2f2e9-8548-431f-9f03-9186942bb48f"),
                SupplierNumber = "SUPP-MEDIVITA",
                Name = "MediVita Pharmaceuticals",
                Type = SupplierType.Manufacturer,
                ContactPerson = "Dr. Michael Chen",
                Email = "sales@medivita.com",
                Phone = "+1-555-987-6543",
                Website = "https://www.medivita.com",
                TaxId = "US-MED-123456789",
                DefaultCurrencyId = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f"), // USD
                DefaultPaymentTermId = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), // NET30
                LeadTimeDays = 7,
                MinimumOrderValue = 1000m,
                Status = SupplierStatus.Active,
                Rating = SupplierRating.Preferred,
                CreatedAt = DateTime.UtcNow
            }
        );

        // MediVita Departments
        modelBuilder.Entity<Department>().HasData(
            new Department { Id = Guid.Parse("c1c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "SALES", Name = "Sales & Marketing", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c2c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "RD", Name = "Research & Development", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c3c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MFG", Name = "Manufacturing", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c4c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "QC", Name = "Quality Control", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c5c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "REG", Name = "Regulatory Affairs", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c6c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "FIN", Name = "Finance", CreatedAt = DateTime.UtcNow },
            new Department { Id = Guid.Parse("c7c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "HR", Name = "Human Resources", CreatedAt = DateTime.UtcNow }
        );

        // MediVita Cost Centers
        modelBuilder.Entity<CostCenter>().HasData(
            new CostCenter { Id = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "CC-PHARMA", Name = "Pharmaceutical Production", Type = CostCenterType.Department, Budget = 5000000m, CreatedAt = DateTime.UtcNow },
            new CostCenter { Id = Guid.Parse("d2c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "CC-RD", Name = "Research Labs", Type = CostCenterType.Department, Budget = 3000000m, CreatedAt = DateTime.UtcNow },
            new CostCenter { Id = Guid.Parse("d3c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "CC-MKT", Name = "Marketing", Type = CostCenterType.Department, Budget = 2000000m, CreatedAt = DateTime.UtcNow },
            new CostCenter { Id = Guid.Parse("d4c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "CC-DIST", Name = "Distribution", Type = CostCenterType.Department, Budget = 1500000m, CreatedAt = DateTime.UtcNow }
        );

        // MediVita Business Locations
        modelBuilder.Entity<BusinessLocation>().HasData(
            new BusinessLocation { Id = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MV-HQ", Name = "MediVita Headquarters", Type = LocationType.Headquarters, AddressLine1 = "123 Healthcare Boulevard", City = "New York", PostalCode = "10001", Country = "USA", Phone = "+1-555-123-4567", Timezone = "America/New_York", CreatedAt = DateTime.UtcNow },
            new BusinessLocation { Id = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MV-MFG", Name = "MediVita Manufacturing Facility", Type = LocationType.Factory, AddressLine1 = "456 Production Drive", City = "Raleigh", PostalCode = "27601", Country = "USA", Phone = "+1-919-555-0123", Timezone = "America/New_York", CreatedAt = DateTime.UtcNow },
            new BusinessLocation { Id = Guid.Parse("e3c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MV-DC", Name = "MediVita Distribution Center", Type = LocationType.Warehouse, AddressLine1 = "789 Logistics Parkway", City = "Atlanta", PostalCode = "30301", Country = "USA", Phone = "+1-404-555-0456", Timezone = "America/New_York", CreatedAt = DateTime.UtcNow },
            new BusinessLocation { Id = Guid.Parse("e4c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MV-RD", Name = "MediVita Research Labs", Type = LocationType.Office, AddressLine1 = "321 Innovation Way", City = "Boston", PostalCode = "02101", Country = "USA", Phone = "+1-617-555-0789", Timezone = "America/New_York", CreatedAt = DateTime.UtcNow }
        );

        // MediVita Employees
        modelBuilder.Entity<Employee>().HasData(
            new Employee
            {
                Id = Guid.Parse("f1c2f2e9-8548-431f-9f03-9186942bb48f"),
                EmployeeNumber = "EMP-MV-001",
                FirstName = "Dr. Sarah",
                LastName = "Johnson",
                Email = "s.johnson@medivita.com",
                PersonalEmail = "sarah.johnson@email.com",
                Phone = "+1-555-123-4567",
                Mobile = "+1-555-123-4568",
                DateOfBirth = new DateTime(1975, 3, 15),
                Gender = Gender.Female,
                Nationality = "American",
                TaxId = "US-SJ-123456789",
                SocialSecurityNumber = "123-45-6789",
                HireDate = new DateTime(2010, 1, 15),
                EmploymentType = EmploymentType.FullTime,
                Status = EmployeeStatus.Active,
                JobTitle = "Chief Executive Officer",
                Salary = 350000m,
                SalaryType = SalaryType.Annual,
                DepartmentId = Guid.Parse("c6c2f2e9-8548-431f-9f03-9186942bb48f"), // FIN
                LocationId = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), // HQ
                CreatedAt = DateTime.UtcNow
            },
            new Employee
            {
                Id = Guid.Parse("f2c2f2e9-8548-431f-9f03-9186942bb48f"),
                EmployeeNumber = "EMP-MV-002",
                FirstName = "Dr. Michael",
                LastName = "Chen",
                Email = "m.chen@medivita.com",
                PersonalEmail = "michael.chen@email.com",
                Phone = "+1-555-987-6543",
                Mobile = "+1-555-987-6544",
                DateOfBirth = new DateTime(1980, 7, 22),
                Gender = Gender.Male,
                Nationality = "American",
                TaxId = "US-MC-987654321",
                SocialSecurityNumber = "987-65-4321",
                HireDate = new DateTime(2012, 3, 1),
                EmploymentType = EmploymentType.FullTime,
                Status = EmployeeStatus.Active,
                JobTitle = "Chief Scientific Officer",
                Salary = 280000m,
                SalaryType = SalaryType.Annual,
                DepartmentId = Guid.Parse("c2c2f2e9-8548-431f-9f03-9186942bb48f"), // RD
                LocationId = Guid.Parse("e4c2f2e9-8548-431f-9f03-9186942bb48f"), // RD Labs
                CreatedAt = DateTime.UtcNow
            },
            new Employee
            {
                Id = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f"),
                EmployeeNumber = "EMP-MV-003",
                FirstName = "Jennifer",
                LastName = "Williams",
                Email = "j.williams@medivita.com",
                PersonalEmail = "jennifer.williams@email.com",
                Phone = "+1-555-456-7890",
                Mobile = "+1-555-456-7891",
                DateOfBirth = new DateTime(1985, 11, 8),
                Gender = Gender.Female,
                Nationality = "American",
                TaxId = "US-JW-456789123",
                SocialSecurityNumber = "456-78-9123",
                HireDate = new DateTime(2015, 6, 15),
                EmploymentType = EmploymentType.FullTime,
                Status = EmployeeStatus.Active,
                JobTitle = "Sales Director",
                Salary = 180000m,
                SalaryType = SalaryType.Annual,
                DepartmentId = Guid.Parse("c1c2f2e9-8548-431f-9f03-9186942bb48f"), // SALES
                LocationId = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), // HQ
                CreatedAt = DateTime.UtcNow
            },
            new Employee
            {
                Id = Guid.Parse("f4c2f2e9-8548-431f-9f03-9186942bb48f"),
                EmployeeNumber = "EMP-MV-004",
                FirstName = "Robert",
                LastName = "Garcia",
                Email = "r.garcia@medivita.com",
                PersonalEmail = "robert.garcia@email.com",
                Phone = "+1-555-321-0987",
                Mobile = "+1-555-321-0988",
                DateOfBirth = new DateTime(1978, 5, 12),
                Gender = Gender.Male,
                Nationality = "American",
                TaxId = "US-RG-321098765",
                SocialSecurityNumber = "321-09-8765",
                HireDate = new DateTime(2011, 9, 1),
                EmploymentType = EmploymentType.FullTime,
                Status = EmployeeStatus.Active,
                JobTitle = "Manufacturing Director",
                Salary = 220000m,
                SalaryType = SalaryType.Annual,
                DepartmentId = Guid.Parse("c3c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG
                LocationId = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG
                CreatedAt = DateTime.UtcNow
            },
            new Employee
            {
                Id = Guid.Parse("f5c2f2e9-8548-431f-9f03-9186942bb48f"),
                EmployeeNumber = "EMP-MV-005",
                FirstName = "Dr. Lisa",
                LastName = "Thompson",
                Email = "l.thompson@medivita.com",
                PersonalEmail = "lisa.thompson@email.com",
                Phone = "+1-555-654-3210",
                Mobile = "+1-555-654-3211",
                DateOfBirth = new DateTime(1982, 9, 30),
                Gender = Gender.Female,
                Nationality = "American",
                TaxId = "US-LT-654321098",
                SocialSecurityNumber = "654-32-1098",
                HireDate = new DateTime(2013, 2, 1),
                EmploymentType = EmploymentType.FullTime,
                Status = EmployeeStatus.Active,
                JobTitle = "Quality Control Manager",
                Salary = 140000m,
                SalaryType = SalaryType.Annual,
                DepartmentId = Guid.Parse("c4c2f2e9-8548-431f-9f03-9186942bb48f"), // QC
                LocationId = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG
                CreatedAt = DateTime.UtcNow
            }
        );

        // MediVita Customer Addresses and Contacts
        modelBuilder.Entity<Address>().HasData(
            new Address { Id = Guid.Parse("f1c2f2e9-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"), AddressLine1 = "123 Healthcare Boulevard", City = "New York", PostalCode = "10001", Country = "USA", IsDefault = true, CreatedAt = DateTime.UtcNow },
            new Address { Id = Guid.Parse("f2c2f2e9-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"), Type = AddressType.Shipping, AddressLine1 = "456 Production Drive", City = "Raleigh", PostalCode = "27601", Country = "USA", IsDefault = false, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Contact>().HasData(
            new Contact { Id = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"), FirstName = "Dr. Sarah", LastName = "Johnson", Email = "procurement@medivita.com", Phone = "+1-555-123-4567", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<BankDetail>().HasData(
            new BankDetail { Id = Guid.Parse("f4c2f2e9-8548-431f-9f03-9186942bb48f"), CustomerId = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"), BankName = "First National Bank", Iban = "US98765432123456789", SwiftCode = "FNBAUS33", CreatedAt = DateTime.UtcNow }
        );

        // MediVita Supplier Addresses and Contacts
        modelBuilder.Entity<Address>().HasData(
            new Address { Id = Guid.Parse("e1c2f2e9-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("b1c2f2e9-8548-431f-9f03-9186942bb48f"), AddressLine1 = "123 Healthcare Boulevard", City = "New York", PostalCode = "10001", Country = "USA", IsDefault = true, CreatedAt = DateTime.UtcNow },
            new Address { Id = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("b1c2f2e9-8548-431f-9f03-9186942bb48f"), Type = AddressType.Shipping, AddressLine1 = "789 Logistics Parkway", City = "Atlanta", PostalCode = "30301", Country = "USA", IsDefault = false, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<Contact>().HasData(
            new Contact { Id = Guid.Parse("e3c2f2e9-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("b1c2f2e9-8548-431f-9f03-9186942bb48f"), FirstName = "Dr. Michael", LastName = "Chen", Email = "sales@medivita.com", Phone = "+1-555-987-6543", CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<BankDetail>().HasData(
            new BankDetail { Id = Guid.Parse("e4c2f2e9-8548-431f-9f03-9186942bb48f"), SupplierId = Guid.Parse("b1c2f2e9-8548-431f-9f03-9186942bb48f"), BankName = "MediVita Corporate Bank", Iban = "US12345678901234567", SwiftCode = "MEDVUS33", CreatedAt = DateTime.UtcNow }
        );

        // MediVita Asset Categories
        modelBuilder.Entity<AssetCategory>().HasData(
            new AssetCategory { Id = Guid.Parse("91c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "LAB-EQUIP", Name = "Laboratory Equipment", CreatedAt = DateTime.UtcNow },
            new AssetCategory { Id = Guid.Parse("92c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "MFG-EQUIP", Name = "Manufacturing Equipment", CreatedAt = DateTime.UtcNow },
            new AssetCategory { Id = Guid.Parse("93c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "VEHICLES", Name = "Company Vehicles", CreatedAt = DateTime.UtcNow },
            new AssetCategory { Id = Guid.Parse("94c2f2e9-8548-431f-9f03-9186942bb48f"), Code = "IT-EQUIP", Name = "IT Equipment", CreatedAt = DateTime.UtcNow }
        );

        // MediVita Assets
        modelBuilder.Entity<Asset>().HasData(
            new Asset
            {
                Id = Guid.Parse("a1c2f2e9-8548-431f-9f03-9186942bb48f"),
                AssetNumber = "MV-LAB-001",
                Name = "High-Performance Liquid Chromatograph (HPLC)",
                Description = "Advanced analytical instrument for pharmaceutical testing",
                Type = AssetType.Equipment,
                Status = AssetStatus.Active,
                CategoryId = Guid.Parse("91c2f2e9-8548-431f-9f03-9186942bb48f"), // LAB-EQUIP
                PurchasePrice = 150000m,
                PurchaseDate = new DateTime(2022, 1, 15),
                CurrentValue = 120000m,
                AccumulatedDepreciation = 30000m,
                SalvageValue = 15000m,
                UsefulLifeMonths = 120, // 10 years
                DepreciationMethod = DepreciationMethod.StraightLine,
                SerialNumber = "HPLC-MV-2022-001",
                Manufacturer = "Agilent Technologies",
                Model = "1260 Infinity II",
                DepartmentId = Guid.Parse("c4c2f2e9-8548-431f-9f03-9186942bb48f"), // QC
                LocationId = Guid.Parse("e4c2f2e9-8548-431f-9f03-9186942bb48f"), // RD Labs
                CostCenterId = Guid.Parse("d2c2f2e9-8548-431f-9f03-9186942bb48f"), // CC-RD
                WarrantyExpiry = new DateTime(2027, 1, 15),
                LastMaintenanceDate = new DateTime(2024, 6, 1),
                NextMaintenanceDate = new DateTime(2025, 6, 1),
                CreatedAt = DateTime.UtcNow
            },
            new Asset
            {
                Id = Guid.Parse("a2c2f2e9-8548-431f-9f03-9186942bb48f"),
                AssetNumber = "MV-MFG-001",
                Name = "Tablet Press Machine",
                Description = "Automated tablet compression machine for pharmaceutical manufacturing",
                Type = AssetType.Equipment,
                Status = AssetStatus.Active,
                CategoryId = Guid.Parse("92c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG-EQUIP
                PurchasePrice = 250000m,
                PurchaseDate = new DateTime(2021, 6, 1),
                CurrentValue = 175000m,
                AccumulatedDepreciation = 75000m,
                SalvageValue = 25000m,
                UsefulLifeMonths = 144, // 12 years
                DepreciationMethod = DepreciationMethod.StraightLine,
                SerialNumber = "TAB-MV-2021-001",
                Manufacturer = "Fette Compacting",
                Model = "2090",
                DepartmentId = Guid.Parse("c3c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG
                LocationId = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f"), // MFG
                CostCenterId = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f"), // CC-PHARMA
                WarrantyExpiry = new DateTime(2026, 6, 1),
                LastMaintenanceDate = new DateTime(2024, 3, 15),
                NextMaintenanceDate = new DateTime(2025, 3, 15),
                CreatedAt = DateTime.UtcNow
            },
            new Asset
            {
                Id = Guid.Parse("a3c2f2e9-8548-431f-9f03-9186942bb48f"),
                AssetNumber = "MV-VEH-001",
                Name = "Delivery Van - Ford Transit",
                Description = "Company vehicle for pharmaceutical product delivery",
                Type = AssetType.Vehicle,
                Status = AssetStatus.Active,
                CategoryId = Guid.Parse("93c2f2e9-8548-431f-9f03-9186942bb48f"), // VEHICLES
                PurchasePrice = 45000m,
                PurchaseDate = new DateTime(2023, 3, 1),
                CurrentValue = 38000m,
                AccumulatedDepreciation = 7000m,
                SalvageValue = 4500m,
                UsefulLifeMonths = 72, // 6 years
                DepreciationMethod = DepreciationMethod.StraightLine,
                SerialNumber = "VAN-MV-2023-001",
                Manufacturer = "Ford",
                Model = "Transit Connect",
                DepartmentId = Guid.Parse("c1c2f2e9-8548-431f-9f03-9186942bb48f"), // SALES
                LocationId = Guid.Parse("e3c2f2e9-8548-431f-9f03-9186942bb48f"), // DC
                CostCenterId = Guid.Parse("d4c2f2e9-8548-431f-9f03-9186942bb48f"), // CC-DIST
                WarrantyExpiry = new DateTime(2026, 3, 1),
                LastMaintenanceDate = new DateTime(2024, 9, 1),
                NextMaintenanceDate = new DateTime(2025, 3, 1),
                CreatedAt = DateTime.UtcNow
            },
            new Asset
            {
                Id = Guid.Parse("a4c2f2e9-8548-431f-9f03-9186942bb48f"),
                AssetNumber = "MV-IT-001",
                Name = "Research Server - Dell PowerEdge",
                Description = "High-performance server for pharmaceutical research computing",
                Type = AssetType.Equipment,
                Status = AssetStatus.Active,
                CategoryId = Guid.Parse("94c2f2e9-8548-431f-9f03-9186942bb48f"), // IT-EQUIP
                PurchasePrice = 12000m,
                PurchaseDate = new DateTime(2023, 8, 15),
                CurrentValue = 9600m,
                AccumulatedDepreciation = 2400m,
                SalvageValue = 1200m,
                UsefulLifeMonths = 60, // 5 years
                DepreciationMethod = DepreciationMethod.StraightLine,
                SerialNumber = "SRV-MV-2023-001",
                Manufacturer = "Dell",
                Model = "PowerEdge R750",
                DepartmentId = Guid.Parse("c2c2f2e9-8548-431f-9f03-9186942bb48f"), // RD
                LocationId = Guid.Parse("e4c2f2e9-8548-431f-9f03-9186942bb48f"), // RD Labs
                CostCenterId = Guid.Parse("d2c2f2e9-8548-431f-9f03-9186942bb48f"), // CC-RD
                WarrantyExpiry = new DateTime(2026, 8, 15),
                LastMaintenanceDate = new DateTime(2024, 8, 15),
                NextMaintenanceDate = new DateTime(2025, 2, 15),
                CreatedAt = DateTime.UtcNow
            }
        );
    }
}
