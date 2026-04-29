using ShopService.Data;
using ShopService.Models;
using Microsoft.EntityFrameworkCore;

namespace ShopService.Services;

public interface ISeedDataService
{
    Task SeedAsync();
}

public class SeedDataService : ISeedDataService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<SeedDataService> _logger;
    private static readonly Guid MediVitaCompanyId = Guid.Parse("f364cea4-9a72-4228-806c-4764607b41a6");
    private static readonly Guid DemoCompanyId = Guid.Parse("ae161374-7185-4aa5-97f4-bcb35cf0ae19");
    private static readonly Guid ReferenceOrderId = Guid.Parse("50000000-0000-0000-0000-000000000001");
    private static readonly Guid ReferenceCustomerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f");
    private static readonly Guid[] ReferenceOrderItemIds =
    {
        Guid.Parse("50000000-0000-0000-0000-000000000011"),
        Guid.Parse("50000000-0000-0000-0000-000000000012")
    };

    public SeedDataService(ShopDbContext context, ILogger<SeedDataService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seeding...");

            // Clear existing sample data and seed MediVita pharmaceutical data
            await ClearExistingDataAsync();

            _logger.LogInformation("Seeding MediVita pharmaceutical brands...");
            await SeedBrands();

            _logger.LogInformation("Seeding MediVita pharmaceutical categories...");
            await SeedCategories();

            _logger.LogInformation("Seeding MediVita pharmaceutical suppliers...");
            await SeedSuppliers();

            _logger.LogInformation("Seeding MediVita pharmaceutical products...");
            await SeedProducts();

            _logger.LogInformation("Seeding MediVita healthcare customers...");
            await SeedCustomers();

            _logger.LogInformation("Seeding shipping methods...");
            await SeedShippingMethods();

            _logger.LogInformation("Seeding sample orders with payments...");
            await SeedOrdersWithPayments();

            // Stamp all seeded data with MediVita company_id
            // (StampCompanyId() in SaveChangesAsync requires HTTP context which is absent during startup)
            _logger.LogInformation("Stamping MediVita company_id on all seeded data...");
            await StampAllSeedDataCompanyId();

            _logger.LogInformation("Cloning seed data for Demo_Corporation...");
            await CloneDataForDemoCompany();

            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }

    private async Task StampAllSeedDataCompanyId()
    {
        var tables = new[] { "products", "categories", "brands", "suppliers", "customers", "orders", "shipping_methods" };
        var companyId = MediVitaCompanyId.ToString();
        foreach (var table in tables)
        {
            // table names are from a hardcoded array — safe to interpolate
            #pragma warning disable EF1002
            await _context.Database.ExecuteSqlRawAsync(
                $"UPDATE {table} SET company_id = {{0}} WHERE company_id = '00000000-0000-0000-0000-000000000000'", companyId);
            #pragma warning restore EF1002
        }
    }

    private async Task ClearExistingDataAsync()
    {
        _logger.LogInformation("Clearing existing sample data...");

        try
        {
            // Use raw SQL to truncate tables in reverse dependency order to avoid foreign key constraints
            // This is more robust than EF Core queries when schema mismatches exist
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE audit_logs CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE inventory_movements CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE coupons CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE shipping_methods CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE brands CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE categories CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE suppliers CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE customers CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE products CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE product_attributes CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE product_variants CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE product_images CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE carts CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE cart_items CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE orders CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE order_items CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE payments CASCADE;");
            await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE order_documents CASCADE;");

            _logger.LogInformation("Existing data cleared successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Some tables may not exist or have schema issues, continuing with seeding...");
            // Continue with seeding even if clearing fails
        }
    }

    private async Task SeedBrands()
    {
        var brands = new[]
        {
            new Brand { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "MediVita", Slug = "medivita", Description = "Premium pharmaceutical solutions - Crafting Health for Life" },
            new Brand { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "VitaWell", Slug = "vitawell", Description = "Advanced vitamin and supplement formulations" },
            new Brand { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "CardioCare", Slug = "cardiocare", Description = "Cardiovascular health and wellness products" },
            new Brand { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "ImmuneBoost", Slug = "immuneboost", Description = "Immune support and preventive care solutions" },
            new Brand { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "NeuroHealth", Slug = "neurohealth", Description = "Neurological health and cognitive enhancement products" }
        };

        await _context.Brands.AddRangeAsync(brands);
        await _context.SaveChangesAsync();
    }

    private async Task SeedCategories()
    {
        var categories = new[]
        {
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Cardiovascular Health", Slug = "cardiovascular-health", Description = "Heart and circulatory system wellness medications", SortOrder = 1 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Vitamins & Supplements", Slug = "vitamins-supplements", Description = "Essential nutrients and nutritional supplements", SortOrder = 2 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Immune Support", Slug = "immune-support", Description = "Immune system strengthening medications and supplements", SortOrder = 3 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Pain Management", Slug = "pain-management", Description = "Analgesics and pain relief medications", SortOrder = 4 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Neurological Health", Slug = "neurological-health", Description = "Brain health and neurological medications", SortOrder = 5 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Respiratory Health", Slug = "respiratory-health", Description = "Lung and respiratory system medications", SortOrder = 6 },
            new Category { Id = Guid.NewGuid(), CompanyId = MediVitaCompanyId, Name = "Digestive Health", Slug = "digestive-health", Description = "Gastrointestinal and digestive system medications", SortOrder = 7 }
        };

        await _context.Categories.AddRangeAsync(categories);
        await _context.SaveChangesAsync();
    }

    private async Task SeedSuppliers()
    {
        var suppliers = new[]
        {
            new Supplier 
            { 
                Id = Guid.NewGuid(), 
                CompanyId = MediVitaCompanyId,
                Name = "PharmaChem Industries", 
                Code = "PCI-001",
                ContactPerson = "Dr. Michael Johnson",
                Email = "supply@pharmachem.com",
                Phone = "+1-908-555-0100",
                Country = "USA",
                City = "New Jersey",
                PostalCode = "07020",
                Address = "100 Pharma Plaza",
                VatNumber = "US98765432"
            },
            new Supplier 
            { 
                Id = Guid.NewGuid(), 
                CompanyId = MediVitaCompanyId,
                Name = "EuroPharmaCorp", 
                Code = "EPC-001",
                ContactPerson = "Dr. Petra Schmidt",
                Email = "logistics@europharmacorp.de",
                Phone = "+49-69-555-1234",
                Country = "Germany",
                City = "Frankfurt",
                PostalCode = "60311",
                Address = "Pharma Strasse 42",
                VatNumber = "DE987654321"
            },
            new Supplier 
            { 
                Id = Guid.NewGuid(), 
                CompanyId = MediVitaCompanyId,
                Name = "Asia BioWellness Ltd", 
                Code = "ABW-001",
                ContactPerson = "Dr. Chen Wei",
                Email = "orders@asiabiowellness.cn",
                Phone = "+86-10-5555-1000",
                Country = "China",
                City = "Shanghai",
                PostalCode = "200000",
                Address = "Pudong Medical Innovation Park 88",
                VatNumber = "CN555888999"
            },
            new Supplier 
            { 
                Id = Guid.NewGuid(), 
                CompanyId = MediVitaCompanyId,
                Name = "MediSwiss AG", 
                Code = "MSA-001",
                ContactPerson = "Dr. Hans Mueller",
                Email = "procurement@medischweiz.ch",
                Phone = "+41-44-555-7890",
                Country = "Switzerland",
                City = "Zurich",
                PostalCode = "8001",
                Address = "Medizinische Innovationen Weg 15",
                VatNumber = "CH123456789"
            }
        };

        await _context.Suppliers.AddRangeAsync(suppliers);
        await _context.SaveChangesAsync();
    }

    private async Task SeedProducts()
    {
        var brands = await _context.Brands.ToListAsync();
        var categories = await _context.Categories.ToListAsync();
        var suppliers = await _context.Suppliers.ToListAsync();

        var products = new[]
        {
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "MediVita CardioPro 50mg",
                Sku = "MV-CP-050",
                Ean = "4001234567890",
                Description = "Advanced cardiovascular medication for heart health. Contains 50mg of active ingredient for optimal blood pressure management.",
                Price = 29.99m,
                CompareAtPrice = 39.99m,
                CostPrice = 12.50m,
                StockQuantity = 200,
                LowStockThreshold = 25,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.02m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "cardiovascular-health")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "medivita")?.Id,
                SupplierId = suppliers.First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "medivita-cardiapro-50mg",
                MetaTitle = "MediVita CardioPro - Heart Health Medication",
                MetaDescription = "Premium cardiovascular medication for blood pressure management and heart health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "VitaWell Vitamin D3 2000IU",
                Sku = "VW-VD3-2000",
                Ean = "4001234567891",
                Description = "High-potency Vitamin D3 supplement for bone health and immune support. 2000IU per capsule for optimal daily intake.",
                Price = 19.99m,
                CompareAtPrice = 24.99m,
                CostPrice = 8.00m,
                StockQuantity = 500,
                LowStockThreshold = 50,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.015m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "vitamins-supplements")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "vitawell")?.Id,
                SupplierId = suppliers.Skip(1).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "vitawell-vitamin-d3-2000iu",
                MetaTitle = "Vitamin D3 2000IU - Bone Health Supplement",
                MetaDescription = "High-potency Vitamin D3 supplement for immune support and bone health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "ImmuneBoost Elderberry Extract",
                Sku = "IB-EB-500",
                Ean = "4001234567892",
                Description = "Natural elderberry extract supplement for immune system support. 500mg standardized extract per capsule.",
                Price = 24.99m,
                CompareAtPrice = 29.99m,
                CostPrice = 10.00m,
                StockQuantity = 300,
                LowStockThreshold = 40,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.018m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "immune-support")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "immuneboost")?.Id,
                SupplierId = suppliers.Skip(2).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "immuneboost-elderberry-extract",
                MetaTitle = "Elderberry Extract - Natural Immune Support",
                MetaDescription = "Premium elderberry extract supplement for immune system health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "NeuroHealth Omega-3 Fish Oil",
                Sku = "NH-OF-1000",
                Ean = "4001234567893",
                Description = "Pure omega-3 fish oil supplement for brain health and cognitive function. 1000mg EPA/DHA per softgel.",
                Price = 34.99m,
                CompareAtPrice = 44.99m,
                CostPrice = 15.00m,
                StockQuantity = 150,
                LowStockThreshold = 20,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.025m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "neurological-health")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "neurohealth")?.Id,
                SupplierId = suppliers.Skip(3).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "neurohealth-omega3-fish-oil",
                MetaTitle = "Omega-3 Fish Oil - Brain Health Supplement",
                MetaDescription = "Premium omega-3 fish oil for cognitive function and neurological health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "MediVita PainRelief 400mg",
                Sku = "MV-PR-400",
                Ean = "4001234567894",
                Description = "Fast-acting pain relief medication. 400mg tablets for effective management of moderate to severe pain.",
                Price = 12.99m,
                CompareAtPrice = 16.99m,
                CostPrice = 5.50m,
                StockQuantity = 400,
                LowStockThreshold = 60,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.01m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "pain-management")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "medivita")?.Id,
                SupplierId = suppliers.First().Id,
                Status = ProductStatus.Active,
                IsFeatured = false,
                Slug = "medivita-painrelief-400mg",
                MetaTitle = "Pain Relief Medication 400mg",
                MetaDescription = "Fast-acting pain relief tablets for effective pain management",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "CardioCare Blood Pressure Monitor",
                Sku = "CC-BPM-001",
                Ean = "4001234567895",
                Description = "Digital automatic blood pressure monitor with memory function. Clinically validated for accuracy.",
                Price = 49.99m,
                CompareAtPrice = 69.99m,
                CostPrice = 22.00m,
                StockQuantity = 75,
                LowStockThreshold = 15,
                TrackInventory = true,
                AllowBackorder = false,
                Weight = 0.35m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "cardiovascular-health")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "cardiocare")?.Id,
                SupplierId = suppliers.Skip(1).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "cardiocare-blood-pressure-monitor",
                MetaTitle = "Digital Blood Pressure Monitor",
                MetaDescription = "Clinically validated automatic blood pressure monitor with memory function",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "MediVita Respiratory Relief Syrup",
                Sku = "MV-RR-150",
                Ean = "4001234567896",
                Description = "Natural respiratory relief syrup for cough and congestion. 150ml bottle with honey and herbal extracts.",
                Price = 16.99m,
                CompareAtPrice = 21.99m,
                CostPrice = 7.00m,
                StockQuantity = 250,
                LowStockThreshold = 35,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.2m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "respiratory-health")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "medivita")?.Id,
                SupplierId = suppliers.Skip(2).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = false,
                Slug = "medivita-respiratory-relief-syrup",
                MetaTitle = "Natural Respiratory Relief Syrup",
                MetaDescription = "Herbal cough syrup for respiratory health and congestion relief",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "VitaWell Probiotic Complex",
                Sku = "VW-PC-50B",
                Ean = "4001234567897",
                Description = "Advanced probiotic supplement with 50 billion CFU for digestive health and immune support.",
                Price = 39.99m,
                CompareAtPrice = 49.99m,
                CostPrice = 18.00m,
                StockQuantity = 120,
                LowStockThreshold = 18,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.03m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "digestive-health")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "vitawell")?.Id,
                SupplierId = suppliers.Skip(3).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "vitawell-probiotic-complex-50b",
                MetaTitle = "Probiotic Complex 50 Billion CFU",
                MetaDescription = "Advanced probiotic supplement for digestive and immune health",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            }
        };

        await _context.Products.AddRangeAsync(products);
        await _context.SaveChangesAsync();
    }

    private async Task SeedCustomers()
    {
        var customers = new[]
        {
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48c"), // Sarah Mitchell
                Email = "dr.sarah.mitchell@medivita.com",
                FirstName = "Sarah",
                LastName = "Mitchell",
                Phone = "+1-555-0101",
                Company = "MediVita Pharmaceuticals",
                DefaultShippingAddress = "123 Health Plaza",
                DefaultShippingCity = "Boston",
                DefaultShippingPostalCode = "02101",
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            },
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48b"), // Robert Johnson
                Email = "pharmacy.chain@wellnessrx.com",
                FirstName = "Robert",
                LastName = "Johnson",
                Phone = "+1-555-0102",
                Company = "WellnessRx Pharmacy Chain",
                DefaultShippingAddress = "456 Medical Center Dr",
                DefaultShippingCity = "Chicago",
                DefaultShippingPostalCode = "60601",
                CreatedAt = DateTime.UtcNow.AddMonths(-5)
            },
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48a"), // Dr. Michael Chen
                Email = "clinic.director@heartcare.org",
                FirstName = "Dr. Michael",
                LastName = "Chen",
                Phone = "+1-555-0103",
                Company = "HeartCare Medical Center",
                DefaultShippingAddress = "789 Cardiology Blvd",
                DefaultShippingCity = "Los Angeles",
                DefaultShippingPostalCode = "90210",
                CreatedAt = DateTime.UtcNow.AddMonths(-4)
            },
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb489"), // Emma Schmidt
                Email = "procurement@vitacorp.eu",
                FirstName = "Emma",
                LastName = "Schmidt",
                Phone = "+49-40-654321",
                Company = "VitaCorp Europe GmbH",
                DefaultShippingAddress = "Friedrichstr. 42",
                DefaultShippingCity = "Berlin",
                DefaultShippingPostalCode = "10969",
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb488"), // David Williams
                Email = "health.retail@naturalwell.com",
                FirstName = "David",
                LastName = "Williams",
                Phone = "+44-20-7946-0123",
                Company = "NaturalWell Health Retail",
                DefaultShippingAddress = "10 Health Street",
                DefaultShippingCity = "London",
                DefaultShippingPostalCode = "SW1A 2AA",
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new Customer 
            { 
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb487"), // Dr. Lisa Garcia
                Email = "research@university.edu",
                FirstName = "Dr. Lisa",
                LastName = "Garcia",
                Phone = "+1-555-0104",
                Company = "University Medical Research Center",
                DefaultShippingAddress = "321 Research Park",
                DefaultShippingCity = "San Francisco",
                DefaultShippingPostalCode = "94105",
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            }
            ,
            // Additional seeded customers with fixed IDs for accounting integration
            new Customer
            {
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f"), // Fixed ID for accounting integration
                Email = "info@mailbase.info",
                FirstName = "Jonas",
                LastName = "R",
                Phone = "+49-170-555-1234",
                Company = "Mailbase.info",
                DefaultShippingAddress = "Hauptstrasse 12",
                DefaultShippingCity = "Hamburg",
                DefaultShippingPostalCode = "20354",
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new Customer
            {
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48e"), // Lisa Bauer
                Email = "lisa.bauer@medsupplies.de",
                FirstName = "Lisa",
                LastName = "Bauer",
                Phone = "+49-40-223344",
                Company = "MedSupplies GmbH",
                DefaultShippingAddress = "Bergstr. 5",
                DefaultShippingCity = "Munich",
                DefaultShippingPostalCode = "80331",
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            },
            new Customer
            {
                Id = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48d"), // Thomas Keller
                Email = "thomas.keller@clinicplus.org",
                FirstName = "Thomas",
                LastName = "Keller",
                Phone = "+41-44-555-6789",
                Company = "ClinicPlus",
                DefaultShippingAddress = "Seestrasse 7",
                DefaultShippingCity = "Zurich",
                DefaultShippingPostalCode = "8002",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            }
        };

        await _context.Customers.AddRangeAsync(customers);
        await _context.SaveChangesAsync();
    }

    private async Task SeedShippingMethods()
    {
        var shippingMethods = new[]
        {
            new ShippingMethod 
            { 
                Id = Guid.NewGuid(),
                Name = "Standard Shipping",
                Code = "STANDARD",
                Description = "Delivery in 5-7 business days",
                Price = 9.99m,
                EstimatedDeliveryDays = 7,
                IsActive = true
            },
            new ShippingMethod 
            { 
                Id = Guid.NewGuid(),
                Name = "Express Shipping",
                Code = "EXPRESS",
                Description = "Delivery in 2-3 business days",
                Price = 24.99m,
                EstimatedDeliveryDays = 3,
                IsActive = true
            },
            new ShippingMethod 
            { 
                Id = Guid.NewGuid(),
                Name = "Overnight Shipping",
                Code = "OVERNIGHT",
                Description = "Next business day delivery",
                Price = 49.99m,
                EstimatedDeliveryDays = 1,
                IsActive = true
            },
            new ShippingMethod 
            { 
                Id = Guid.NewGuid(),
                Name = "Local Pickup",
                Code = "PICKUP",
                Description = "Pick up at our store",
                Price = 0m,
                EstimatedDeliveryDays = 0,
                IsActive = true
            }
        };

        await _context.ShippingMethods.AddRangeAsync(shippingMethods);
        await _context.SaveChangesAsync();
    }

    private async Task SeedOrdersWithPayments()
    {
        var customers = await _context.Customers.ToListAsync();
        var products = await _context.Products.ToListAsync();
        var shippingMethods = await _context.ShippingMethods.ToListAsync();

        var orders = new List<Order>();
        var random = new Random();

        // Ensure the canonical demo order (ORD-1001) always exists for template tests
        var referenceOrder = CreateReferenceOrder(customers, products, shippingMethods);
        if (referenceOrder != null)
        {
            orders.Add(referenceOrder);
        }

        // Create 12 orders - some with payments
        for (int i = 0; i < 12; i++)
        {
            var customer = customers[i % customers.Count];
            var shippingMethod = shippingMethods[random.Next(shippingMethods.Count)];
            
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = $"ORD-{DateTime.UtcNow.Year:0000}-{i + 1:0000}",
                CustomerId = customer.Id,
                // Force seeded orders into Pending state for consistent testing
                Status = OrderStatus.Pending,
                PaymentStatus = i % 2 == 0 ? PaymentStatus.Paid : PaymentStatus.Pending,
                Currency = "EUR",
                ShippingMethodId = shippingMethod.Id,
                ShippingName = $"{customer.FirstName} {customer.LastName}",
                ShippingAddress = $"{random.Next(100, 9999)} Main St",
                ShippingCity = new[] { "New York", "Berlin", "Beijing", "London", "Tokyo" }[i % 5],
                ShippingPostalCode = $"{random.Next(10000, 99999)}",
                ShippingCountry = new[] { "USA", "Germany", "China", "UK", "Japan" }[i % 5],
                DiscountAmount = i % 4 == 0 ? 10.00m : 0,
                Notes = i % 5 == 0 ? "Please deliver after 5 PM" : null,
                CreatedAt = DateTime.UtcNow.AddDays(-(12 - i)),
                UpdatedAt = DateTime.UtcNow.AddDays(-(12 - i))
            };

            // Add order items
            var itemCount = random.Next(1, 4);
            decimal subtotal = 0;
            
            for (int j = 0; j < itemCount; j++)
            {
                var product = products[random.Next(products.Count)];
                var quantity = random.Next(1, 4);
                decimal itemSubtotal = product.Price * quantity;
                decimal itemTax = itemSubtotal * 0.19m;
                decimal itemTotal = itemSubtotal + itemTax;
                subtotal += itemSubtotal;

                order.Items.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    Quantity = quantity,
                    UnitPrice = product.Price,
                    TaxAmount = itemTax,
                    Total = itemTotal,
                    CreatedAt = DateTime.UtcNow.AddDays(-(12 - i))
                });
            }

            order.Subtotal = subtotal;
            order.TaxAmount = subtotal * 0.19m;
            order.ShippingAmount = shippingMethod.Price;
            order.Total = subtotal + order.TaxAmount + order.ShippingAmount - order.DiscountAmount;

            orders.Add(order);
        }

        // Ensure Jonas has explicit pending orders
        var jonas = customers.FirstOrDefault(c => c.Email == "jonas.roth@mailbase.info");
        if (jonas != null)
        {
            for (int k = 0; k < 2; k++)
            {
                var shippingMethod = shippingMethods[random.Next(shippingMethods.Count)];
                var jonasOrder = new Order
                {
                    Id = Guid.NewGuid(),
                    OrderNumber = $"ORD-{DateTime.UtcNow.Year:0000}-J{DateTime.UtcNow.Ticks % 10000 + k}",
                    CustomerId = jonas.Id,
                    Status = OrderStatus.Pending,
                    PaymentStatus = PaymentStatus.Pending,
                    Currency = "EUR",
                    ShippingMethodId = shippingMethod.Id,
                    ShippingName = $"{jonas.FirstName} {jonas.LastName}",
                    ShippingAddress = jonas.DefaultShippingAddress,
                    ShippingCity = jonas.DefaultShippingCity,
                    ShippingPostalCode = jonas.DefaultShippingPostalCode,
                    ShippingCountry = "Germany",
                    DiscountAmount = 0,
                    Notes = "Test order for Jonas",
                    CreatedAt = DateTime.UtcNow.AddDays(-2 + k),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2 + k)
                };

                // Add a single item to Jonas' orders
                var product = products[random.Next(products.Count)];
                jonasOrder.Items.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = jonasOrder.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    UnitPrice = product.Price,
                    TaxAmount = product.Price * 0.19m,
                    Total = product.Price + (product.Price * 0.19m),
                    CreatedAt = DateTime.UtcNow.AddDays(-2 + k)
                });

                jonasOrder.Subtotal = product.Price;
                jonasOrder.TaxAmount = product.Price * 0.19m;
                jonasOrder.ShippingAmount = shippingMethod.Price;
                jonasOrder.Total = jonasOrder.Subtotal + jonasOrder.TaxAmount + jonasOrder.ShippingAmount - jonasOrder.DiscountAmount;

                orders.Add(jonasOrder);
            }
        }
        await _context.Orders.AddRangeAsync(orders);
        await _context.SaveChangesAsync();

        // Add payments to some orders (50% of orders)
        var ordersWithPayments = orders.Where((_, i) => i % 2 == 0).ToList();
        var payments = new List<Payment>();

        foreach (var order in ordersWithPayments)
        {
            var paymentAmount = order.Total * (random.Next(50, 101) / 100m); // 50-100% of order total
            
            payments.Add(new Payment
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Amount = paymentAmount,
                Currency = "EUR",
                Method = (PaymentMethod)(random.Next(0, 9)),
                Status = random.Next(0, 2) == 0 ? PaymentTransactionStatus.Completed : PaymentTransactionStatus.Pending,
                TransactionId = $"TXN-{Guid.NewGuid():N}".Substring(0, 20),
                ProcessedAt = DateTime.UtcNow.AddDays(-(12 - orders.IndexOf(order))),
                CreatedAt = DateTime.UtcNow.AddDays(-(12 - orders.IndexOf(order)))
            });
        }


        // Ensure the canonical demo order always has a completed payment for stable previews
        var referenceOrderId = ReferenceOrderId;
        if (orders.Any(o => o.Id == referenceOrderId) && !payments.Any(p => p.OrderId == referenceOrderId))
        {
            var order = orders.First(o => o.Id == referenceOrderId);
            payments.Add(new Payment
            {
                Id = Guid.Parse("50000000-0000-0000-0000-000000000021"),
                OrderId = referenceOrderId,
                Amount = order.Total,
                Currency = order.Currency,
                Method = PaymentMethod.CreditCard,
                Status = PaymentTransactionStatus.Completed,
                TransactionId = "TXN-REF-ORD-1001",
                ProcessedAt = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });
        }
        await _context.Payments.AddRangeAsync(payments);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Seeded {orders.Count} orders and {payments.Count} payments");
    }

    private Order? CreateReferenceOrder(List<Customer> customers, List<Product> products, List<ShippingMethod> shippingMethods)
    {
        if (customers.Count == 0 || products.Count == 0 || shippingMethods.Count == 0)
        {
            _logger.LogWarning("Skipping reference order seeding due to missing dependencies");
            return null;
        }

        var referenceCustomer = customers.FirstOrDefault(c => c.Id == ReferenceCustomerId) ?? customers.First();
        var shippingMethod = shippingMethods.First();
        var demoProducts = products.Take(ReferenceOrderItemIds.Length).ToList();
        if (demoProducts.Count == 0)
        {
            _logger.LogWarning("Not enough products available to build reference order");
            return null;
        }

        var order = new Order
        {
            Id = ReferenceOrderId,
            OrderNumber = "ORD-1001",
            CustomerId = referenceCustomer.Id,
            Status = OrderStatus.Confirmed,
            PaymentStatus = PaymentStatus.Paid,
            Currency = "EUR",
            ShippingMethodId = shippingMethod.Id,
            ShippingName = $"{referenceCustomer.FirstName} {referenceCustomer.LastName}",
            ShippingAddress = referenceCustomer.DefaultShippingAddress ?? "Hauptstrasse 12",
            ShippingCity = referenceCustomer.DefaultShippingCity ?? "Hamburg",
            ShippingPostalCode = referenceCustomer.DefaultShippingPostalCode ?? "20354",
            ShippingCountry = referenceCustomer.DefaultShippingCountry ?? "Germany",
            DiscountAmount = 0,
            Notes = "Reference order for PDF/template previews",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow.AddDays(-6)
        };

        decimal subtotal = 0;
        for (var i = 0; i < demoProducts.Count; i++)
        {
            var product = demoProducts[i];
            var quantity = i + 1;
            var lineSubtotal = product.Price * quantity;
            var lineTax = Math.Round(lineSubtotal * 0.19m, 2);
            subtotal += lineSubtotal;

            order.Items.Add(new OrderItem
            {
                Id = ReferenceOrderItemIds.Length > i ? ReferenceOrderItemIds[i] : Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                Sku = product.Sku,
                Quantity = quantity,
                UnitPrice = product.Price,
                TaxAmount = lineTax,
                Total = lineSubtotal + lineTax,
                CreatedAt = order.CreatedAt
            });
        }

        order.Subtotal = subtotal;
        order.TaxAmount = Math.Round(subtotal * 0.19m, 2);
        order.ShippingAmount = shippingMethod.Price;
        order.Total = order.Subtotal + order.TaxAmount + order.ShippingAmount - order.DiscountAmount;

        return order;
    }

    private async Task CloneDataForDemoCompany()
    {
        var mediVita = MediVitaCompanyId.ToString();
        var demo = DemoCompanyId.ToString();

        // Clone brands with '-demo' slug suffix
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO brands (id, company_id, name, slug, description, website, logo_url, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, name, slug || '-demo', description, website, logo_url, is_active, NOW(), NULL
            FROM brands WHERE company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone categories with '-demo' slug suffix
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO categories (id, company_id, name, slug, description, parent_id, sort_order, is_active, image_url, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, name, slug || '-demo', description, NULL, sort_order, is_active, image_url, NOW(), NULL
            FROM categories WHERE company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone suppliers with '-D' code suffix
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO suppliers (id, company_id, name, code, contact_person, email, phone, country, city, postal_code, address, vat_number, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, name, code || '-D', contact_person, 'demo.' || email, phone, country, city, postal_code, address, vat_number, is_active, NOW(), NULL
            FROM suppliers WHERE company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone customers with 'demo.' email prefix
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO customers (id, company_id, email, first_name, last_name, phone, company, default_shipping_address, default_shipping_city, default_shipping_postal_code, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, 'demo.' || email, first_name, last_name, phone, company, default_shipping_address, default_shipping_city, default_shipping_postal_code, is_active, NOW(), NULL
            FROM customers WHERE company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone shipping methods with '-D' code suffix
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO shipping_methods (id, company_id, name, code, description, price, estimated_delivery_days, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, name, code || '-D', description, price, estimated_delivery_days, is_active, NOW(), NULL
            FROM shipping_methods WHERE company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone products mapping FKs to Demo equivalents by name
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO products (id, company_id, name, description, sku, ean, price, compare_at_price, cost_price,
                   stock_quantity, low_stock_threshold, track_inventory, allow_backorder, weight, weight_unit,
                   length, width, height, dimension_unit, category_id, brand_id, supplier_id,
                   status, is_featured, is_digital, slug, meta_title, meta_description, created_at, updated_at, published_at)
            SELECT gen_random_uuid(), {0}, p.name, p.description, p.sku || '-D', p.ean, p.price, p.compare_at_price, p.cost_price,
                   p.stock_quantity, p.low_stock_threshold, p.track_inventory, p.allow_backorder, p.weight, p.weight_unit,
                   p.length, p.width, p.height, p.dimension_unit,
                   (SELECT dc.id FROM categories dc JOIN categories mc ON mc.name = dc.name WHERE mc.id = p.category_id AND dc.company_id = {0} LIMIT 1),
                   (SELECT db.id FROM brands db JOIN brands mb ON mb.name = db.name WHERE mb.id = p.brand_id AND db.company_id = {0} LIMIT 1),
                   (SELECT ds.id FROM suppliers ds JOIN suppliers ms ON ms.name = ds.name WHERE ms.id = p.supplier_id AND ds.company_id = {0} LIMIT 1),
                   p.status, p.is_featured, p.is_digital, p.slug || '-demo', p.meta_title, p.meta_description, NOW(), NULL, p.published_at
            FROM products p WHERE p.company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone orders mapping customer FKs by first_name
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO orders (id, company_id, order_number, customer_id, status, payment_status,
                   subtotal, tax_amount, shipping_amount, discount_amount, total, currency, notes, internal_notes,
                   shipping_name, shipping_address, shipping_city, shipping_postal_code, shipping_country, shipping_phone,
                   billing_name, billing_address, billing_city, billing_postal_code, billing_country,
                   shipping_method_id, tracking_number, shipped_at, delivered_at, created_at, updated_at)
            SELECT gen_random_uuid(), {0}, 'DEMO-' || o.order_number,
                   COALESCE((SELECT dc.id FROM customers dc WHERE dc.company_id = {0}
                             AND dc.first_name = (SELECT mc.first_name FROM customers mc WHERE mc.id = o.customer_id) LIMIT 1), o.customer_id),
                   o.status, o.payment_status, o.subtotal, o.tax_amount, o.shipping_amount, o.discount_amount, o.total, o.currency,
                   o.notes, o.internal_notes, o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_postal_code,
                   o.shipping_country, o.shipping_phone, o.billing_name, o.billing_address, o.billing_city, o.billing_postal_code,
                   o.billing_country, NULL, o.tracking_number, o.shipped_at, o.delivered_at, o.created_at, o.updated_at
            FROM orders o WHERE o.company_id = {1}
            ON CONFLICT DO NOTHING", demo, mediVita);

        // Clone order_items mapping to Demo orders and products
        await _context.Database.ExecuteSqlRawAsync($@"
            INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, sku, quantity,
                   unit_price, discount_amount, tax_amount, total, notes, created_at)
            SELECT gen_random_uuid(), demo_o.id,
                   COALESCE((SELECT dp.id FROM products dp WHERE dp.company_id = {0}
                             AND dp.name = (SELECT mp.name FROM products mp WHERE mp.id = oi.product_id) LIMIT 1), oi.product_id),
                   oi.variant_id, oi.product_name, oi.sku, oi.quantity, oi.unit_price, oi.discount_amount,
                   oi.tax_amount, oi.total, oi.notes, oi.created_at
            FROM order_items oi
            JOIN orders orig_o ON orig_o.id = oi.order_id AND orig_o.company_id = {1}
            JOIN orders demo_o ON demo_o.order_number = 'DEMO-' || orig_o.order_number AND demo_o.company_id = {0}", demo, mediVita);

        _logger.LogInformation("Demo_Corporation seed data cloned successfully");
    }
}
