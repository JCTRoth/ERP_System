using FluentAssertions;
using MasterdataService.Data;
using MasterdataService.Models;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace MasterdataService.Tests;

/// <summary>
/// Verifies that the EF Core migrations produce a schema matching the
/// multi-tenant entity model.
///
/// Reproduces the regression where the <c>CompanyId</c> column was missing
/// from <c>AssetCategories</c> (and other core tables) even though the model
/// requires it — which made startup seeding fail with
/// <c>column "CompanyId" of relation "AssetCategories" does not exist</c>.
/// Fixed by the <c>AddCompanyIdToMasterdataTables</c> migration.
/// </summary>
public class MigrationSchemaTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("masterdatatest")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public async Task InitializeAsync() => await _postgres.StartAsync();

    public async Task DisposeAsync() => await _postgres.DisposeAsync();

    private MasterdataDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MasterdataDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        return new MasterdataDbContext(options);
    }

    [Fact]
    public async Task AssetCategories_has_CompanyId_column_after_migrations()
    {
        using var context = CreateContext();
        await context.Database.MigrateAsync();

        var columns = await context.Database
            .SqlQueryRaw<string>(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'AssetCategories'")
            .ToListAsync();

        columns.Should().Contain(c => c.Equals("CompanyId", StringComparison.OrdinalIgnoreCase),
            "the AssetCategories table must expose the CompanyId column used by the model and seed");
    }

    [Fact]
    public async Task Can_insert_asset_category_with_company_id_after_migrations()
    {
        using var context = CreateContext();
        await context.Database.MigrateAsync();

        var category = new AssetCategory
        {
            Id = Guid.NewGuid(),
            CompanyId = Guid.NewGuid(),
            Code = "TEST",
            Name = "Test Category",
            DefaultUsefulLifeMonths = 36,
            DefaultDepreciationMethod = DepreciationMethod.StraightLine,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        context.AssetCategories.Add(category);
        await context.SaveChangesAsync();

        var stored = await context.AssetCategories.FirstOrDefaultAsync(a => a.Code == "TEST");
        stored.Should().NotBeNull();
        stored!.CompanyId.Should().Be(category.CompanyId);
    }
}
