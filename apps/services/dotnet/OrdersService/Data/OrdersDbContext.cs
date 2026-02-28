using Microsoft.EntityFrameworkCore;
using OrdersService.Models;
using OrdersService.Services;

namespace OrdersService.Data;

public class OrdersDbContext : DbContext
{
    private readonly Guid? _companyId;

    public static readonly Guid DemoCompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public OrdersDbContext(DbContextOptions<OrdersDbContext> options, ICompanyContext companyContext) : base(options)
    {
        _companyId = companyContext.CurrentCompanyId;
    }

    // Design-time constructor
    public OrdersDbContext(DbContextOptions<OrdersDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

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

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OrderDate);
            entity.HasQueryFilter(e => _companyId == null || e.CompanyId == _companyId);

            entity.HasMany(e => e.Items)
                .WithOne(i => i.Order)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.TotalAmount)
                .HasPrecision(18, 2);
        });

        // OrderItem configuration
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.ProductId);

            entity.Property(e => e.UnitPrice)
                .HasPrecision(18, 2);

            entity.Property(e => e.LineTotal)
                .HasPrecision(18, 2);
        });
    }
}
