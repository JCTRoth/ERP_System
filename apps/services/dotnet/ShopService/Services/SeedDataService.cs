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

            if (!await _context.Brands.AnyAsync())
            {
                _logger.LogInformation("Seeding brands...");
                await SeedBrands();
            }

            if (!await _context.Categories.AnyAsync())
            {
                _logger.LogInformation("Seeding categories...");
                await SeedCategories();
            }

            if (!await _context.Suppliers.AnyAsync())
            {
                _logger.LogInformation("Seeding suppliers...");
                await SeedSuppliers();
            }

            if (!await _context.Products.AnyAsync())
            {
                _logger.LogInformation("Seeding products...");
                await SeedProducts();
            }

            if (!await _context.Customers.AnyAsync())
            {
                _logger.LogInformation("Seeding customers...");
                await SeedCustomers();
            }

            if (!await _context.ShippingMethods.AnyAsync())
            {
                _logger.LogInformation("Seeding shipping methods...");
                await SeedShippingMethods();
            }

            if (!await _context.Orders.AnyAsync())
            {
                _logger.LogInformation("Seeding orders with items and payments...");
                await SeedOrdersWithPayments();
            }

            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }

    private async Task SeedBrands()
    {
        var brands = new[]
        {
            new Brand { Id = Guid.NewGuid(), Name = "MediVita", Slug = "medivita", Description = "Premium pharmaceutical solutions - Crafting Health for Life" },
            new Brand { Id = Guid.NewGuid(), Name = "VitaWell", Slug = "vitawell", Description = "Advanced vitamin and supplement formulations" },
            new Brand { Id = Guid.NewGuid(), Name = "CardioCare", Slug = "cardiocare", Description = "Cardiovascular health and wellness products" },
            new Brand { Id = Guid.NewGuid(), Name = "ImmuneBoost", Slug = "immuneboost", Description = "Immune support and preventive care solutions" },
            new Brand { Id = Guid.NewGuid(), Name = "WellnessFirst", Slug = "wellnessfirst", Description = "Holistic wellness and prevention products" }
        };

        await _context.Brands.AddRangeAsync(brands);
        await _context.SaveChangesAsync();
    }

    private async Task SeedCategories()
    {
        var categories = new[]
        {
            new Category { Id = Guid.NewGuid(), Name = "Cardiovascular Health", Slug = "cardiovascular-health", Description = "Heart and circulatory system wellness", SortOrder = 1 },
            new Category { Id = Guid.NewGuid(), Name = "Vitamins & Supplements", Slug = "vitamins-supplements", Description = "Essential nutrients and nutritional supplements", SortOrder = 2 },
            new Category { Id = Guid.NewGuid(), Name = "Immune Support", Slug = "immune-support", Description = "Immune system strengthening products", SortOrder = 3 },
            new Category { Id = Guid.NewGuid(), Name = "Pain Management", Slug = "pain-management", Description = "Relief and management of various pain conditions", SortOrder = 4 },
            new Category { Id = Guid.NewGuid(), Name = "Wellness & Prevention", Slug = "wellness-prevention", Description = "Preventive health and overall wellness solutions", SortOrder = 5 }
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
                Name = "Wireless Bluetooth Headphones",
                Sku = "WBH-001",
                Ean = "5901234123457",
                Description = "Premium wireless headphones with noise cancellation",
                Price = 99.99m,
                CompareAtPrice = 149.99m,
                CostPrice = 45.00m,
                StockQuantity = 150,
                LowStockThreshold = 20,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.25m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "electronics")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "techpro")?.Id,
                SupplierId = suppliers.First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "wireless-bluetooth-headphones",
                MetaTitle = "Best Wireless Headphones",
                MetaDescription = "Premium wireless headphones with noise cancellation technology",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "USB-C Fast Charging Cable",
                Sku = "USB-C-001",
                Ean = "5901234123458",
                Description = "High-speed USB-C charging and data cable",
                Price = 14.99m,
                CompareAtPrice = 24.99m,
                CostPrice = 5.00m,
                StockQuantity = 500,
                LowStockThreshold = 100,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.05m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "electronics")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "acme-corp")?.Id,
                SupplierId = suppliers.Skip(1).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "usb-c-fast-charging-cable",
                MetaTitle = "High-Speed USB-C Cable",
                MetaDescription = "Reliable USB-C cable for fast charging and data transfer",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "Ergonomic Office Chair",
                Sku = "EOC-001",
                Ean = "5901234123459",
                Description = "Comfortable ergonomic office chair with lumbar support",
                Price = 249.99m,
                CompareAtPrice = 399.99m,
                CostPrice = 120.00m,
                StockQuantity = 75,
                LowStockThreshold = 10,
                TrackInventory = true,
                AllowBackorder = false,
                Weight = 12.5m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "office-supplies")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "premium-line")?.Id,
                SupplierId = suppliers.First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "ergonomic-office-chair",
                MetaTitle = "Best Office Chair",
                MetaDescription = "Premium ergonomic office chair for maximum comfort",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "4K Webcam",
                Sku = "WC-4K-001",
                Ean = "5901234123460",
                Description = "Professional 4K webcam with auto-focus",
                Price = 129.99m,
                CompareAtPrice = 179.99m,
                CostPrice = 60.00m,
                StockQuantity = 200,
                LowStockThreshold = 30,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.18m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "electronics")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "techpro")?.Id,
                SupplierId = suppliers.Skip(2).First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "4k-webcam",
                MetaTitle = "Professional 4K Webcam",
                MetaDescription = "Crystal clear 4K video for meetings and streaming",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow
            },
            new Product 
            { 
                Id = Guid.NewGuid(),
                Name = "Mechanical Keyboard RGB",
                Sku = "KB-RGB-001",
                Ean = "5901234123461",
                Description = "Gaming mechanical keyboard with RGB lighting",
                Price = 89.99m,
                CompareAtPrice = 139.99m,
                CostPrice = 40.00m,
                StockQuantity = 120,
                LowStockThreshold = 15,
                TrackInventory = true,
                AllowBackorder = true,
                Weight = 0.95m,
                WeightUnit = "kg",
                CategoryId = categories.FirstOrDefault(c => c.Slug == "electronics")?.Id,
                BrandId = brands.FirstOrDefault(b => b.Slug == "budget-options")?.Id,
                SupplierId = suppliers.First().Id,
                Status = ProductStatus.Active,
                IsFeatured = true,
                Slug = "mechanical-keyboard-rgb",
                MetaTitle = "Gaming Mechanical Keyboard",
                MetaDescription = "High-performance keyboard with customizable RGB lighting",
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
                Id = Guid.NewGuid(),
                Email = "jonas.roth@mailbase.info",
                FirstName = "Jonas",
                LastName = "Roth",
                Phone = "+49-30-123456",
                Company = "Tech Solutions GmbH",
                DefaultShippingAddress = "Hauptstr. 1",
                DefaultShippingCity = "Berlin",
                DefaultShippingPostalCode = "10115",
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            },
            new Customer 
            { 
                Id = Guid.NewGuid(),
                Email = "sarah.johnson@email.com",
                FirstName = "Sarah",
                LastName = "Johnson",
                Phone = "+1-555-0101",
                Company = "Johnson & Associates",
                DefaultShippingAddress = "123 Main St",
                DefaultShippingCity = "New York",
                DefaultShippingPostalCode = "10001",
                CreatedAt = DateTime.UtcNow.AddMonths(-5)
            },
            new Customer 
            { 
                Id = Guid.NewGuid(),
                Email = "michael.chen@tech.com",
                FirstName = "Michael",
                LastName = "Chen",
                Phone = "+86-10-1234567",
                Company = "Chen Tech Industries",
                DefaultShippingAddress = "No. 1 Changan Avenue",
                DefaultShippingCity = "Beijing",
                DefaultShippingPostalCode = "100000",
                CreatedAt = DateTime.UtcNow.AddMonths(-4)
            },
            new Customer 
            { 
                Id = Guid.NewGuid(),
                Email = "emma.schmidt@example.de",
                FirstName = "Emma",
                LastName = "Schmidt",
                Phone = "+49-40-654321",
                Company = "Schmidt Consulting",
                DefaultShippingAddress = "Friedrichstr. 42",
                DefaultShippingCity = "Berlin",
                DefaultShippingPostalCode = "10969",
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new Customer 
            { 
                Id = Guid.NewGuid(),
                Email = "david.williams@corp.com",
                FirstName = "David",
                LastName = "Williams",
                Phone = "+1-555-0102",
                Company = "Williams Corporation",
                DefaultShippingAddress = "10 Downing Street",
                DefaultShippingCity = "London",
                DefaultShippingPostalCode = "SW1A 2AA",
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
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
                Status = (OrderStatus)(i % 4),  // PENDING=0, CONFIRMED=1, SHIPPED=2, DELIVERED=3
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

        await _context.Payments.AddRangeAsync(payments);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Seeded {orders.Count} orders and {payments.Count} payments");
    }
}
