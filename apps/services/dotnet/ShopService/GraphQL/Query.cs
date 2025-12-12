using HotChocolate;
using Microsoft.EntityFrameworkCore;
using ShopService.Data;
using ShopService.Models;
using ShopService.Services;

namespace ShopService.GraphQL;

public class Query
{
    // Products
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Product> GetProducts([Service] ShopDbContext context)
        => context.Products.Include(p => p.Images).Include(p => p.Category).AsNoTracking();

    public async Task<Product?> GetProduct([Service] IProductService productService, Guid id)
        => await productService.GetByIdAsync(id);

    public async Task<IEnumerable<Product>> GetProductsByCategory(
        [Service] IProductService productService, Guid categoryId)
        => await productService.GetByCategoryAsync(categoryId);

    public async Task<IEnumerable<Product>> GetFeaturedProducts(
        [Service] IProductService productService, int take = 10)
        => await productService.GetFeaturedAsync(take);

    public async Task<IEnumerable<Product>> SearchProducts(
        [Service] IProductService productService, string searchTerm)
        => await productService.SearchAsync(searchTerm);

    public async Task<IEnumerable<Product>> GetLowStockProducts(
        [Service] IProductService productService, int threshold = 10)
        => await productService.GetLowStockAsync(threshold);

    // Categories
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Category> GetCategories([Service] ShopDbContext context)
        => context.Categories.Include(c => c.SubCategories).AsNoTracking();

    public async Task<Category?> GetCategory([Service] ICategoryService categoryService, Guid id)
        => await categoryService.GetByIdAsync(id);

    public async Task<IEnumerable<Category>> GetRootCategories([Service] ICategoryService categoryService)
        => await categoryService.GetRootCategoriesAsync();

    // Brands
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Brand> GetBrands([Service] ShopDbContext context)
        => context.Brands.AsNoTracking();

    public async Task<Brand?> GetBrand([Service] IBrandService brandService, Guid id)
        => await brandService.GetByIdAsync(id);

    // Suppliers
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Supplier> GetSuppliers([Service] ShopDbContext context)
        => context.Suppliers.AsNoTracking();

    public async Task<Supplier?> GetSupplier([Service] ISupplierService supplierService, Guid id)
        => await supplierService.GetByIdAsync(id);

    // Customers
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Customer> GetCustomers([Service] ShopDbContext context)
        => context.Customers.AsNoTracking();

    public async Task<Customer?> GetCustomer([Service] ICustomerService customerService, Guid id)
        => await customerService.GetByIdAsync(id);

    public async Task<Customer?> GetCustomerByUserId(
        [Service] ICustomerService customerService, Guid userId)
        => await customerService.GetByUserIdAsync(userId);

    // Orders
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Order> GetOrders([Service] ShopDbContext context)
        => context.Orders.Include(o => o.Customer).Include(o => o.Items).AsNoTracking();

    public async Task<Order?> GetOrder([Service] IOrderService orderService, Guid id)
        => await orderService.GetByIdAsync(id);

    public async Task<Order?> GetOrderByNumber([Service] IOrderService orderService, string orderNumber)
        => await orderService.GetByOrderNumberAsync(orderNumber);

    public async Task<IEnumerable<Order>> GetOrdersByCustomer(
        [Service] IOrderService orderService, Guid customerId)
        => await orderService.GetByCustomerAsync(customerId);

    public async Task<IEnumerable<Order>> GetRecentOrders(
        [Service] IOrderService orderService, int count = 10)
        => await orderService.GetRecentAsync(count);

    // Cart
    public async Task<Cart?> GetCart([Service] ICartService cartService, Guid id)
        => await cartService.GetByIdAsync(id);

    public async Task<Cart?> GetCartBySession([Service] ICartService cartService, string sessionId)
        => await cartService.GetBySessionIdAsync(sessionId);

    public async Task<Cart?> GetCartByCustomer([Service] ICartService cartService, Guid customerId)
        => await cartService.GetByCustomerIdAsync(customerId);

    // Shipping Methods
    [UseProjection]
    [UseFiltering]
    public IQueryable<ShippingMethod> GetShippingMethods([Service] ShopDbContext context)
        => context.ShippingMethods.Where(s => s.IsActive).AsNoTracking();

    public async Task<IEnumerable<ShippingMethod>> GetAvailableShippingMethods(
        [Service] IShippingService shippingService,
        decimal orderTotal,
        string? country = null,
        decimal? weight = null)
        => await shippingService.GetAvailableForOrderAsync(orderTotal, country, weight);

    // Coupons
    [UseProjection]
    [UseFiltering]
    public IQueryable<Coupon> GetCoupons([Service] ShopDbContext context)
        => context.Coupons.AsNoTracking();

    public async Task<Coupon?> GetCoupon([Service] ICouponService couponService, Guid id)
        => await couponService.GetByIdAsync(id);

    public async Task<bool> ValidateCoupon(
        [Service] ICouponService couponService,
        string code,
        decimal orderTotal,
        Guid? customerId = null)
        => await couponService.ValidateCouponAsync(code, orderTotal, customerId);

    // Analytics
    public async Task<decimal> GetTotalRevenue(
        [Service] IOrderService orderService,
        DateTime? from = null,
        DateTime? to = null)
        => await orderService.GetTotalRevenueAsync(from, to);

    public async Task<int> GetOrderCount(
        [Service] IOrderService orderService,
        DateTime? from = null,
        DateTime? to = null)
        => await orderService.GetOrderCountAsync(from, to);

    // Inventory
    public async Task<int> GetStock(
        [Service] IInventoryService inventoryService,
        Guid productId,
        Guid? variantId = null)
        => await inventoryService.GetStockAsync(productId, variantId);

    public async Task<IEnumerable<InventoryMovement>> GetInventoryMovements(
        [Service] IInventoryService inventoryService,
        Guid productId,
        int take = 50)
        => await inventoryService.GetMovementsAsync(productId, take);
}
