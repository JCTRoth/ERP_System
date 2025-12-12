using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface IInventoryService
{
    Task<int> GetStockAsync(Guid productId, Guid? variantId = null);
    Task<IEnumerable<InventoryMovement>> GetMovementsAsync(Guid productId, int take = 50);
    Task<InventoryMovement> AdjustAsync(InventoryAdjustmentInput input);
    Task<bool> ReserveAsync(Guid productId, Guid? variantId, int quantity, string reference);
    Task<bool> ReleaseAsync(Guid productId, Guid? variantId, int quantity, string reference);
    Task<IEnumerable<Product>> GetLowStockProductsAsync();
    Task<bool> RestockAsync(Guid productId, Guid? variantId, int quantity, Guid? supplierId, string? reference);
}

public class InventoryService : IInventoryService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<InventoryService> _logger;
    private readonly IConfiguration _configuration;

    public InventoryService(ShopDbContext context, ILogger<InventoryService> logger, IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<int> GetStockAsync(Guid productId, Guid? variantId = null)
    {
        if (variantId.HasValue)
        {
            var variant = await _context.ProductVariants.FindAsync(variantId);
            return variant?.StockQuantity ?? 0;
        }

        var product = await _context.Products.FindAsync(productId);
        return product?.StockQuantity ?? 0;
    }

    public async Task<IEnumerable<InventoryMovement>> GetMovementsAsync(Guid productId, int take = 50)
    {
        return await _context.InventoryMovements
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .ToListAsync();
    }

    public async Task<InventoryMovement> AdjustAsync(InventoryAdjustmentInput input)
    {
        var movementType = Enum.Parse<MovementType>(input.Type);
        int quantityBefore;
        int quantityAfter;

        if (input.VariantId.HasValue)
        {
            var variant = await _context.ProductVariants.FindAsync(input.VariantId);
            if (variant == null)
                throw new InvalidOperationException($"Variant {input.VariantId} not found");

            quantityBefore = variant.StockQuantity;
            variant.StockQuantity += input.QuantityChange;
            quantityAfter = variant.StockQuantity;
            variant.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var product = await _context.Products.FindAsync(input.ProductId);
            if (product == null)
                throw new InvalidOperationException($"Product {input.ProductId} not found");

            quantityBefore = product.StockQuantity;
            product.StockQuantity += input.QuantityChange;
            quantityAfter = product.StockQuantity;
            product.UpdatedAt = DateTime.UtcNow;

            // Check low stock
            if (product.TrackInventory && product.StockQuantity <= (product.LowStockThreshold ?? 10))
            {
                // TODO: Send low stock notification via Kafka
                _logger.LogWarning("Low stock alert: Product {ProductId} has {Stock} items",
                    product.Id, product.StockQuantity);
            }
        }

        var movement = new InventoryMovement
        {
            Id = Guid.NewGuid(),
            ProductId = input.ProductId,
            VariantId = input.VariantId,
            Type = movementType,
            Quantity = input.QuantityChange,
            QuantityBefore = quantityBefore,
            QuantityAfter = quantityAfter,
            Reason = input.Reason,
            Reference = input.Reference,
            CreatedAt = DateTime.UtcNow
        };

        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Inventory adjusted: Product {ProductId}, Change: {Change}, Type: {Type}",
            input.ProductId, input.QuantityChange, input.Type);

        return movement;
    }

    public async Task<bool> ReserveAsync(Guid productId, Guid? variantId, int quantity, string reference)
    {
        var stock = await GetStockAsync(productId, variantId);
        if (stock < quantity)
            return false;

        await AdjustAsync(new InventoryAdjustmentInput(
            productId,
            variantId,
            -quantity,
            "Sale",
            $"Reserved for {reference}",
            reference
        ));

        return true;
    }

    public async Task<bool> ReleaseAsync(Guid productId, Guid? variantId, int quantity, string reference)
    {
        await AdjustAsync(new InventoryAdjustmentInput(
            productId,
            variantId,
            quantity,
            "Return",
            $"Released from {reference}",
            reference
        ));

        return true;
    }

    public async Task<IEnumerable<Product>> GetLowStockProductsAsync()
    {
        var defaultThreshold = _configuration.GetValue<int>("Shop:LowStockThreshold", 10);

        return await _context.Products
            .Where(p => p.TrackInventory &&
                        p.StockQuantity <= (p.LowStockThreshold ?? defaultThreshold))
            .Include(p => p.Supplier)
            .OrderBy(p => p.StockQuantity)
            .ToListAsync();
    }

    public async Task<bool> RestockAsync(Guid productId, Guid? variantId, int quantity, Guid? supplierId, string? reference)
    {
        await AdjustAsync(new InventoryAdjustmentInput(
            productId,
            variantId,
            quantity,
            "Restock",
            $"Restock from supplier",
            reference
        ));

        return true;
    }
}
