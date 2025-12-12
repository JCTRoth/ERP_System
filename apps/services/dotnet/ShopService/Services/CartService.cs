using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.DTOs;
using ShopService.Models;

namespace ShopService.Services;

public interface ICartService
{
    Task<Cart?> GetByIdAsync(Guid id);
    Task<Cart?> GetBySessionIdAsync(string sessionId);
    Task<Cart?> GetByCustomerIdAsync(Guid customerId);
    Task<Cart> GetOrCreateAsync(Guid? customerId, string? sessionId);
    Task<Cart> AddItemAsync(AddToCartInput input);
    Task<Cart?> UpdateItemAsync(UpdateCartItemInput input);
    Task<Cart?> RemoveItemAsync(Guid cartItemId);
    Task<Cart?> ApplyCouponAsync(ApplyCouponInput input);
    Task<Cart?> RemoveCouponAsync(Guid cartId);
    Task<bool> ClearCartAsync(Guid cartId);
    Task<Cart?> MergeCartsAsync(Guid guestCartId, Guid customerId);
    Task CleanupExpiredCartsAsync();
}

public class CartService : ICartService
{
    private readonly ShopDbContext _context;
    private readonly ILogger<CartService> _logger;
    private readonly ICouponService _couponService;
    private readonly IConfiguration _configuration;

    public CartService(
        ShopDbContext context,
        ILogger<CartService> logger,
        ICouponService couponService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _couponService = couponService;
        _configuration = configuration;
    }

    public async Task<Cart?> GetByIdAsync(Guid id)
    {
        return await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Cart?> GetBySessionIdAsync(string sessionId)
    {
        return await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.SessionId == sessionId);
    }

    public async Task<Cart?> GetByCustomerIdAsync(Guid customerId)
    {
        return await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.CustomerId == customerId);
    }

    public async Task<Cart> GetOrCreateAsync(Guid? customerId, string? sessionId)
    {
        Cart? cart = null;

        if (customerId.HasValue)
        {
            cart = await GetByCustomerIdAsync(customerId.Value);
        }
        else if (!string.IsNullOrEmpty(sessionId))
        {
            cart = await GetBySessionIdAsync(sessionId);
        }

        if (cart == null)
        {
            var expirationHours = _configuration.GetValue<int>("Shop:CartExpirationHours", 72);

            cart = new Cart
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                SessionId = sessionId,
                Currency = _configuration.GetValue<string>("Shop:DefaultCurrency") ?? "EUR",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(expirationHours)
            };

            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Cart created: {CartId}", cart.Id);
        }

        return cart;
    }

    public async Task<Cart> AddItemAsync(AddToCartInput input)
    {
        var cart = await GetOrCreateAsync(input.CustomerId, input.SessionId);

        // Check if product exists
        var product = await _context.Products.FindAsync(input.ProductId);
        if (product == null)
            throw new InvalidOperationException($"Product {input.ProductId} not found");

        // Check stock
        if (product.TrackInventory && !product.AllowBackorder && product.StockQuantity < input.Quantity)
            throw new InvalidOperationException($"Insufficient stock for product {product.Name}");

        // Check if item already in cart
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == input.ProductId && i.VariantId == input.VariantId);

        if (existingItem != null)
        {
            existingItem.Quantity += input.Quantity;
            existingItem.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var cartItem = new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductId = input.ProductId,
                VariantId = input.VariantId,
                Quantity = input.Quantity,
                UnitPrice = product.Price,
                CreatedAt = DateTime.UtcNow
            };

            cart.Items.Add(cartItem);
        }

        await RecalculateCartAsync(cart);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Item added to cart {CartId}: Product {ProductId} x {Quantity}",
            cart.Id, input.ProductId, input.Quantity);

        return cart;
    }

    public async Task<Cart?> UpdateItemAsync(UpdateCartItemInput input)
    {
        var cartItem = await _context.CartItems
            .Include(i => i.Cart)
            .ThenInclude(c => c.Items)
            .FirstOrDefaultAsync(i => i.Id == input.CartItemId);

        if (cartItem == null) return null;

        if (input.Quantity <= 0)
        {
            _context.CartItems.Remove(cartItem);
        }
        else
        {
            cartItem.Quantity = input.Quantity;
            cartItem.UpdatedAt = DateTime.UtcNow;
        }

        var cart = cartItem.Cart;
        await RecalculateCartAsync(cart);
        await _context.SaveChangesAsync();

        return cart;
    }

    public async Task<Cart?> RemoveItemAsync(Guid cartItemId)
    {
        var cartItem = await _context.CartItems
            .Include(i => i.Cart)
            .ThenInclude(c => c.Items)
            .FirstOrDefaultAsync(i => i.Id == cartItemId);

        if (cartItem == null) return null;

        var cart = cartItem.Cart;
        _context.CartItems.Remove(cartItem);

        await RecalculateCartAsync(cart);
        await _context.SaveChangesAsync();

        return cart;
    }

    public async Task<Cart?> ApplyCouponAsync(ApplyCouponInput input)
    {
        var cart = await GetByIdAsync(input.CartId);
        if (cart == null) return null;

        var isValid = await _couponService.ValidateCouponAsync(input.CouponCode, cart.Subtotal, cart.CustomerId);
        if (!isValid)
        {
            _logger.LogWarning("Invalid coupon code {CouponCode} for cart {CartId}", input.CouponCode, input.CartId);
            return cart;
        }

        cart.CouponCode = input.CouponCode;
        await RecalculateCartAsync(cart);
        await _context.SaveChangesAsync();

        return cart;
    }

    public async Task<Cart?> RemoveCouponAsync(Guid cartId)
    {
        var cart = await GetByIdAsync(cartId);
        if (cart == null) return null;

        cart.CouponCode = null;
        cart.DiscountAmount = 0;
        await RecalculateCartAsync(cart);
        await _context.SaveChangesAsync();

        return cart;
    }

    public async Task<bool> ClearCartAsync(Guid cartId)
    {
        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == cartId);

        if (cart == null) return false;

        _context.CartItems.RemoveRange(cart.Items);
        cart.Subtotal = 0;
        cart.TaxAmount = 0;
        cart.DiscountAmount = 0;
        cart.Total = 0;
        cart.CouponCode = null;
        cart.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<Cart?> MergeCartsAsync(Guid guestCartId, Guid customerId)
    {
        var guestCart = await GetByIdAsync(guestCartId);
        if (guestCart == null) return null;

        var customerCart = await GetByCustomerIdAsync(customerId);

        if (customerCart == null)
        {
            // Assign guest cart to customer
            guestCart.CustomerId = customerId;
            guestCart.SessionId = null;
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return guestCart;
        }

        // Merge items from guest cart to customer cart
        foreach (var item in guestCart.Items)
        {
            var existingItem = customerCart.Items.FirstOrDefault(i =>
                i.ProductId == item.ProductId && i.VariantId == item.VariantId);

            if (existingItem != null)
            {
                existingItem.Quantity += item.Quantity;
                existingItem.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newItem = new CartItem
                {
                    Id = Guid.NewGuid(),
                    CartId = customerCart.Id,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    CreatedAt = DateTime.UtcNow
                };
                customerCart.Items.Add(newItem);
            }
        }

        // Delete guest cart
        _context.Carts.Remove(guestCart);

        await RecalculateCartAsync(customerCart);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Merged cart {GuestCartId} into {CustomerCartId}", guestCartId, customerCart.Id);

        return customerCart;
    }

    public async Task CleanupExpiredCartsAsync()
    {
        var expiredCarts = await _context.Carts
            .Where(c => c.ExpiresAt != null && c.ExpiresAt < DateTime.UtcNow)
            .ToListAsync();

        _context.Carts.RemoveRange(expiredCarts);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cleaned up {Count} expired carts", expiredCarts.Count);
    }

    private async Task RecalculateCartAsync(Cart cart)
    {
        var taxRate = _configuration.GetValue<decimal>("Shop:TaxRate", 0.19m);

        decimal subtotal = 0;
        foreach (var item in cart.Items)
        {
            item.Total = item.UnitPrice * item.Quantity;
            subtotal += item.Total;
        }

        cart.Subtotal = subtotal;
        cart.TaxAmount = subtotal * taxRate;

        // Apply coupon if exists
        if (!string.IsNullOrEmpty(cart.CouponCode))
        {
            var discount = await _couponService.ApplyCouponAsync(cart.CouponCode, subtotal, cart.CustomerId);
            cart.DiscountAmount = discount ?? 0;
        }
        else
        {
            cart.DiscountAmount = 0;
        }

        cart.Total = cart.Subtotal + cart.TaxAmount - cart.DiscountAmount;
        cart.UpdatedAt = DateTime.UtcNow;
    }
}
