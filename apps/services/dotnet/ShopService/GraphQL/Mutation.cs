using HotChocolate;
using HotChocolate.Subscriptions;
using ShopService.DTOs;
using ShopService.Models;
using ShopService.Services;

namespace ShopService.GraphQL;

public class Mutation
{
    // Products
    public async Task<Product> CreateProduct(
        [Service] IProductService productService,
        CreateProductInput input)
    {
        try
        {
            return await productService.CreateAsync(input);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating product: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    public async Task<Product?> UpdateProduct(
        Guid id,
        [Service] IProductService productService,
        UpdateProductInput input)
    {
        var inputWithId = input with { Id = id };
        return await productService.UpdateAsync(inputWithId);
    }

    public async Task<bool> DeleteProduct(
        [Service] IProductService productService,
        Guid id)
        => await productService.DeleteAsync(id);

    public async Task<ProductImage> AddProductImage(
        [Service] IProductService productService,
        Guid productId,
        string url,
        string? altText,
        bool isPrimary = false)
        => await productService.AddImageAsync(productId, url, altText, isPrimary);

    public async Task<bool> RemoveProductImage(
        [Service] IProductService productService,
        Guid imageId)
        => await productService.RemoveImageAsync(imageId);

    public async Task<ProductVariant> AddProductVariant(
        [Service] IProductService productService,
        Guid productId,
        CreateVariantInput input)
        => await productService.AddVariantAsync(productId, input);

    public async Task<bool> RemoveProductVariant(
        [Service] IProductService productService,
        Guid variantId)
        => await productService.RemoveVariantAsync(variantId);

    // Categories
    public async Task<Category> CreateCategory(
        [Service] ICategoryService categoryService,
        CreateCategoryInput input)
        => await categoryService.CreateAsync(input);

    public async Task<Category?> UpdateCategory(
        [Service] ICategoryService categoryService,
        UpdateCategoryInput input)
        => await categoryService.UpdateAsync(input);

    public async Task<bool> DeleteCategory(
        [Service] ICategoryService categoryService,
        Guid id)
        => await categoryService.DeleteAsync(id);

    // Brands
    public async Task<Brand> CreateBrand(
        [Service] IBrandService brandService,
        CreateBrandInput input)
        => await brandService.CreateAsync(input);

    public async Task<Brand?> UpdateBrand(
        [Service] IBrandService brandService,
        UpdateBrandInput input)
        => await brandService.UpdateAsync(input);

    public async Task<bool> DeleteBrand(
        [Service] IBrandService brandService,
        Guid id)
        => await brandService.DeleteAsync(id);

    // Suppliers
    [GraphQLName("createShopSupplier")]
    public async Task<Supplier> CreateSupplier(
        [Service] ISupplierService supplierService,
        CreateSupplierInput input)
        => await supplierService.CreateAsync(input);

    [GraphQLName("updateShopSupplier")]
    public async Task<Supplier?> UpdateSupplier(
        [Service] ISupplierService supplierService,
        UpdateSupplierInput input)
        => await supplierService.UpdateAsync(input);

    [GraphQLName("deleteShopSupplier")]
    public async Task<bool> DeleteSupplier(
        [Service] ISupplierService supplierService,
        Guid id)
        => await supplierService.DeleteAsync(id);

    // Orders
    [GraphQLDescription("Create a new order (ShopService)")]
    [GraphQLName("createShopOrder")]
    public async Task<Order> CreateOrder(
        [Service] IOrderService orderService,
        [Service] ITopicEventSender eventSender,
        CreateOrderInput input)
    {
        var order = await orderService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnShopOrderCreated), order);
        return order;
    }

    [GraphQLDescription("Update order status (ShopService)")]
    [GraphQLName("updateShopOrderStatus")]
    public async Task<Order?> UpdateOrderStatus(
        [Service] IOrderService orderService,
        [Service] ITopicEventSender eventSender,
        UpdateOrderStatusInput input)
    {
        var order = await orderService.UpdateStatusAsync(input);
        if (order != null)
        {
            await eventSender.SendAsync(nameof(Subscription.OnOrderStatusChanged), order);
        }
        return order;
    }

    [GraphQLDescription("Cancel an order (ShopService)")]
    [GraphQLName("cancelShopOrder")]
    public async Task<bool> CancelOrder(
        [Service] IOrderService orderService,
        Guid id,
        string? reason = null)
        => await orderService.CancelAsync(id, reason);

    [GraphQLDescription("Delete an order (ShopService)")]
    [GraphQLName("deleteShopOrder")]
    public async Task<bool> DeleteOrder(
        [Service] IOrderService orderService,
        Guid id)
        => await orderService.DeleteAsync(id);

    // Cart
    public async Task<Cart> AddToCart(
        [Service] ICartService cartService,
        AddToCartInput input)
        => await cartService.AddItemAsync(input);

    public async Task<Cart?> UpdateCartItem(
        [Service] ICartService cartService,
        UpdateCartItemInput input)
        => await cartService.UpdateItemAsync(input);

    public async Task<Cart?> RemoveCartItem(
        [Service] ICartService cartService,
        Guid cartItemId)
        => await cartService.RemoveItemAsync(cartItemId);

    public async Task<Cart?> ApplyCouponToCart(
        [Service] ICartService cartService,
        ApplyCouponInput input)
        => await cartService.ApplyCouponAsync(input);

    public async Task<Cart?> RemoveCouponFromCart(
        [Service] ICartService cartService,
        Guid cartId)
        => await cartService.RemoveCouponAsync(cartId);

    public async Task<bool> ClearCart(
        [Service] ICartService cartService,
        Guid cartId)
        => await cartService.ClearCartAsync(cartId);

    public async Task<Cart?> MergeCarts(
        [Service] ICartService cartService,
        Guid guestCartId,
        Guid customerId)
        => await cartService.MergeCartsAsync(guestCartId, customerId);

    // Inventory
    public async Task<InventoryMovement> AdjustInventory(
        [Service] IInventoryService inventoryService,
        InventoryAdjustmentInput input)
        => await inventoryService.AdjustAsync(input);

    public async Task<bool> RestockProduct(
        [Service] IInventoryService inventoryService,
        Guid productId,
        Guid? variantId,
        int quantity,
        Guid? supplierId = null,
        string? reference = null)
        => await inventoryService.RestockAsync(productId, variantId, quantity, supplierId, reference);

    // Coupons
    public async Task<Coupon> CreateCoupon(
        [Service] ICouponService couponService,
        CreateCouponInput input)
        => await couponService.CreateAsync(input);

    public async Task<Coupon?> UpdateCoupon(
        [Service] ICouponService couponService,
        Guid id,
        CreateCouponInput input)
        => await couponService.UpdateAsync(id, input);

    public async Task<bool> DeleteCoupon(
        [Service] ICouponService couponService,
        Guid id)
        => await couponService.DeleteAsync(id);

    // Shipping Methods
    public async Task<ShippingMethod> CreateShippingMethod(
        [Service] IShippingService shippingService,
        CreateShippingMethodInput input)
        => await shippingService.CreateAsync(input);

    public async Task<ShippingMethod?> UpdateShippingMethod(
        [Service] IShippingService shippingService,
        Guid id,
        CreateShippingMethodInput input)
        => await shippingService.UpdateAsync(id, input);

    public async Task<bool> DeleteShippingMethod(
        [Service] IShippingService shippingService,
        Guid id)
        => await shippingService.DeleteAsync(id);

    // Payments
    public async Task<Payment> CreatePayment(
        [Service] IPaymentService paymentService,
        CreatePaymentInput input)
        => await paymentService.CreateAsync(input);

    public async Task<Payment?> ProcessPayment(
        [Service] IPaymentService paymentService,
        Guid paymentId)
        => await paymentService.ProcessAsync(paymentId);

    public async Task<Payment?> RefundPayment(
        [Service] IPaymentService paymentService,
        Guid paymentId,
        decimal? amount = null,
        string? reason = null)
        => await paymentService.RefundAsync(paymentId, amount, reason);

    public async Task<bool> VoidPayment(
        [Service] IPaymentService paymentService,
        Guid paymentId,
        string? reason = null)
        => await paymentService.VoidAsync(paymentId, reason);
}
