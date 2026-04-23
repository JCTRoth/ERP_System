using MasterdataService.Data;
using Microsoft.EntityFrameworkCore;

namespace MasterdataService.Services;

/// <summary>
/// Handles initialization of the Masterdata database, including migrations and seeding.
/// </summary>
internal static class MasterdataInitializer
{
    public static void InitializeDatabase(WebApplication app)
    {
        const int maxAttempts = 12;
        const int delaySeconds = 5;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var scope = app.Services.CreateScope();
            var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("MasterdataStartup");

            try
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<MasterdataDbContext>();
                if (!dbContext.Database.IsRelational())
                {
                    return;
                }

                dbContext.Database.Migrate();
                SeedMasterdata(dbContext);

                var taxCodes = dbContext.TaxCodes.ToList();
                if (taxCodes.Any())
                {
                    var stdTax = taxCodes.FirstOrDefault(t => t.Code == "STD");
                    if (stdTax != null && stdTax.Rate != 19m)
                    {
                        stdTax.Rate = 19m;
                        stdTax.Description = "Standard sales tax (19%)";
                    }

                    var reducedTax = taxCodes.FirstOrDefault(t => t.Code == "REDUCED");
                    if (reducedTax != null && reducedTax.Rate != 7m)
                    {
                        reducedTax.Rate = 7m;
                        reducedTax.Description = "Reduced sales tax (7%)";
                    }

                    if (!taxCodes.Any(t => t.Code == "REDUCED2"))
                    {
                        dbContext.TaxCodes.Add(new Models.TaxCode
                        {
                            Id = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f"),
                            Code = "REDUCED2",
                            Name = "Reduced Rate 2",
                            Description = "Reduced sales tax (16%)",
                            Rate = 16m,
                            Type = Models.TaxType.Sales,
                            IsActive = true,
                            EffectiveFrom = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                            UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                        });
                    }
                    else
                    {
                        var reduced2Tax = taxCodes.FirstOrDefault(t => t.Code == "REDUCED2");
                        if (reduced2Tax != null && reduced2Tax.Rate != 16m)
                        {
                            reduced2Tax.Rate = 16m;
                            reduced2Tax.Description = "Reduced sales tax (16%)";
                        }
                    }

                    dbContext.SaveChanges();
                }

                logger.LogInformation("Masterdata database initialized on attempt {Attempt}", attempt);
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Masterdata database initialization attempt {Attempt}/{MaxAttempts} failed",
                    attempt,
                    maxAttempts);

                if (attempt == maxAttempts)
                {
                    throw;
                }

                Thread.Sleep(TimeSpan.FromSeconds(delaySeconds));
            }
        }
    }

    private static void SeedMasterdata(MasterdataDbContext dbContext)
    {
        var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

        var usdId = Guid.Parse("7ca8b132-80ad-4f74-8050-8faf5fc80e65");
        var eurId = Guid.Parse("bfa8dfd2-3494-48ff-9bad-dea7bdffaf52");
        var net30Id = Guid.Parse("954cbd54-2042-4c64-813a-3bf3f7e30651");
        var stdTaxId = Guid.Parse("d1c2f2e9-8548-431f-9f03-9186942bb48f");
        var reducedTaxId = Guid.Parse("e2c2f2e9-8548-431f-9f03-9186942bb48f");
        var reduced2TaxId = Guid.Parse("f3c2f2e9-8548-431f-9f03-9186942bb48f");
        var departmentId = Guid.Parse("70000000-0000-0000-0000-000000000001");
        var employeeId = Guid.Parse("8a2f2e9e-8548-431f-9f03-9186942bb48f");
        var customerId = Guid.Parse("3fc2f2e9-8548-431f-9f03-9186942bb48f");
        var supplierId = Guid.Parse("6a2f2e9e-8548-431f-9f03-9186942bb48f");
        var assetCategoryId = Guid.Parse("80000000-0000-0000-0000-000000000001");
        var assetId = Guid.Parse("80000000-0000-0000-0000-000000000011");

        if (!dbContext.Currencies.Any(c => c.Code == "USD"))
        {
            dbContext.Currencies.Add(new Models.Currency
            {
                Id = usdId,
                Code = "USD",
                Name = "US Dollar",
                Symbol = "$",
                DecimalPlaces = 2,
                ExchangeRate = 1m,
                IsBaseCurrency = true,
                IsActive = true,
                CreatedAt = now
            });
        }

        if (!dbContext.Currencies.Any(c => c.Code == "EUR"))
        {
            dbContext.Currencies.Add(new Models.Currency
            {
                Id = eurId,
                Code = "EUR",
                Name = "Euro",
                Symbol = "€",
                DecimalPlaces = 2,
                ExchangeRate = 0.92m,
                IsBaseCurrency = false,
                IsActive = true,
                CreatedAt = now
            });
        }

        if (!dbContext.PaymentTerms.Any(p => p.Code == "NET30"))
        {
            dbContext.PaymentTerms.Add(new Models.PaymentTerm
            {
                Id = net30Id,
                Code = "NET30",
                Name = "Net 30",
                Description = "Payment due within 30 days",
                DueDays = 30,
                Type = Models.PaymentTermType.Net,
                IsActive = true,
                CreatedAt = now
            });
        }

        if (!dbContext.TaxCodes.Any(t => t.Code == "STD"))
        {
            dbContext.TaxCodes.Add(new Models.TaxCode
            {
                Id = stdTaxId,
                Code = "STD",
                Name = "Standard Rate",
                Description = "Standard sales tax (19%)",
                Rate = 19m,
                Type = Models.TaxType.Sales,
                IsActive = true,
                IsDefault = true,
                EffectiveFrom = now,
                CreatedAt = now
            });
        }

        if (!dbContext.TaxCodes.Any(t => t.Code == "REDUCED"))
        {
            dbContext.TaxCodes.Add(new Models.TaxCode
            {
                Id = reducedTaxId,
                Code = "REDUCED",
                Name = "Reduced Rate",
                Description = "Reduced sales tax (7%)",
                Rate = 7m,
                Type = Models.TaxType.Sales,
                IsActive = true,
                EffectiveFrom = now,
                CreatedAt = now
            });
        }

        if (!dbContext.TaxCodes.Any(t => t.Code == "REDUCED2"))
        {
            dbContext.TaxCodes.Add(new Models.TaxCode
            {
                Id = reduced2TaxId,
                Code = "REDUCED2",
                Name = "Reduced Rate 2",
                Description = "Reduced sales tax (16%)",
                Rate = 16m,
                Type = Models.TaxType.Sales,
                IsActive = true,
                EffectiveFrom = now,
                CreatedAt = now
            });
        }

        if (!dbContext.Departments.Any(d => d.Code == "SALES"))
        {
            dbContext.Departments.Add(new Models.Department
            {
                Id = departmentId,
                Code = "SALES",
                Name = "Sales",
                IsActive = true,
                CreatedAt = now
            });
        }

        if (!dbContext.Employees.Any(e => e.EmployeeNumber == "EMP-0001"))
        {
            dbContext.Employees.Add(new Models.Employee
            {
                Id = employeeId,
                EmployeeNumber = "EMP-0001",
                FirstName = "Alice",
                LastName = "Admin",
                Email = "alice.admin@example.com",
                HireDate = now,
                EmploymentType = Models.EmploymentType.FullTime,
                Status = Models.EmployeeStatus.Active,
                SalaryType = Models.SalaryType.Monthly,
                Currency = "USD",
                DepartmentId = departmentId,
                CreatedAt = now
            });
        }

        if (!dbContext.Customers.Any(c => c.CustomerNumber == "CUST-000001"))
        {
            dbContext.Customers.Add(new Models.Customer
            {
                Id = customerId,
                CustomerNumber = "CUST-000001",
                Name = "Jonas R",
                LegalName = "Mailbase.info",
                Type = Models.CustomerType.Individual,
                ContactPerson = "Jonas R",
                Email = "info@mailbase.info",
                Phone = "+1-555-0101",
                DefaultCurrencyId = usdId,
                DefaultPaymentTermId = net30Id,
                CreditLimit = 50000m,
                CurrentBalance = 0m,
                Status = Models.CustomerStatus.Active,
                CreatedAt = now
            });
        }

        if (!dbContext.Suppliers.Any(s => s.SupplierNumber == "SUPP-0001"))
        {
            dbContext.Suppliers.Add(new Models.Supplier
            {
                Id = supplierId,
                SupplierNumber = "SUPP-0001",
                Name = "ACME Supplies",
                Type = Models.SupplierType.Vendor,
                ContactPerson = "Jane Supplier",
                Email = "supplier@acme.example",
                Phone = "+1-555-0202",
                DefaultCurrencyId = usdId,
                DefaultPaymentTermId = net30Id,
                LeadTimeDays = 7,
                MinimumOrderValue = 100m,
                Status = Models.SupplierStatus.Active,
                Rating = Models.SupplierRating.Standard,
                CreatedAt = now
            });
        }

        if (!dbContext.AssetCategories.Any(a => a.Code == "IT"))
        {
            dbContext.AssetCategories.Add(new Models.AssetCategory
            {
                Id = assetCategoryId,
                Code = "IT",
                Name = "IT Equipment",
                DefaultUsefulLifeMonths = 60,
                DefaultDepreciationMethod = Models.DepreciationMethod.StraightLine,
                IsActive = true,
                CreatedAt = now
            });
        }

        if (!dbContext.Assets.Any(a => a.AssetNumber == "ASSET-0001"))
        {
            dbContext.Assets.Add(new Models.Asset
            {
                Id = assetId,
                AssetNumber = "ASSET-0001",
                Name = "Laptop Demo",
                Type = Models.AssetType.Computer,
                Status = Models.AssetStatus.Active,
                CategoryId = assetCategoryId,
                PurchasePrice = 1200m,
                PurchaseDate = now,
                CurrentValue = 1200m,
                AccumulatedDepreciation = 0m,
                UsefulLifeMonths = 36,
                DepreciationMethod = Models.DepreciationMethod.StraightLine,
                Currency = "USD",
                CreatedAt = now
            });
        }

        dbContext.SaveChanges();
    }
}
