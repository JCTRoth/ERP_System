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
        => await productService.CreateAsync(input);

    public async Task<Product?> UpdateProduct(
        [Service] IProductService productService,
        UpdateProductInput input)
        => await productService.UpdateAsync(input);

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
    public async Task<Supplier> CreateSupplier(
        [Service] ISupplierService supplierService,
        CreateSupplierInput input)
        => await supplierService.CreateAsync(input);

    public async Task<Supplier?> UpdateSupplier(
        [Service] ISupplierService supplierService,
        UpdateSupplierInput input)
        => await supplierService.UpdateAsync(input);

    public async Task<bool> DeleteSupplier(
        [Service] ISupplierService supplierService,
        Guid id)
        => await supplierService.DeleteAsync(id);

    // Customers
    public async Task<Customer> CreateCustomer(
        [Service] ICustomerService customerService,
        CreateCustomerInput input)
        => await customerService.CreateAsync(input);

    public async Task<Customer?> UpdateCustomer(
        [Service] ICustomerService customerService,
        UpdateCustomerInput input)
        => await customerService.UpdateAsync(input);

    public async Task<bool> DeleteCustomer(
        [Service] ICustomerService customerService,
        Guid id)
        => await customerService.DeleteAsync(id);

    // Orders
    public async Task<Order> CreateOrder(
        [Service] IOrderService orderService,
        [Service] ITopicEventSender eventSender,
        CreateOrderInput input)
    {
        var order = await orderService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnOrderCreated), order);
        return order;
    }

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

    public async Task<bool> CancelOrder(
        [Service] IOrderService orderService,
        Guid orderId,
        string? reason = null)
        => await orderService.CancelAsync(orderId, reason);

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
