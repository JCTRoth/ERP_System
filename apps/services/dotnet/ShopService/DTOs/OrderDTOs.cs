namespace ShopService.DTOs;

// Customer DTOs
public record CustomerDto(
    Guid Id,
    Guid? UserId,
    string Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Company,
    string Type,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateCustomerInput(
    Guid? UserId,
    string Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Company,
    string? VatNumber,
    string? DefaultShippingAddress,
    string? DefaultShippingCity,
    string? DefaultShippingPostalCode,
    string? DefaultShippingCountry,
    string? DefaultBillingAddress,
    string? DefaultBillingCity,
    string? DefaultBillingPostalCode,
    string? DefaultBillingCountry,
    string Type,
    bool AcceptsMarketing
);

public record UpdateCustomerInput(
    Guid Id,
    string? Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Company,
    string? VatNumber,
    string? DefaultShippingAddress,
    string? DefaultShippingCity,
    string? DefaultShippingPostalCode,
    string? DefaultShippingCountry,
    string? DefaultBillingAddress,
    string? DefaultBillingCity,
    string? DefaultBillingPostalCode,
    string? DefaultBillingCountry,
    string? Type,
    bool? IsActive,
    bool? AcceptsMarketing
);

// Order DTOs
public record OrderDto(
    Guid Id,
    string OrderNumber,
    Guid CustomerId,
    string Status,
    string PaymentStatus,
    decimal Subtotal,
    decimal TaxAmount,
    decimal ShippingAmount,
    decimal DiscountAmount,
    decimal Total,
    string Currency,
    DateTime CreatedAt
);

[GraphQLName("ShopCreateOrderInput")]
public record CreateOrderInput(
    Guid CustomerId,
    List<CreateOrderItemInput> Items,
    string? Notes,
    decimal? TaxRate,
    string? ShippingName,
    string? ShippingAddress,
    string? ShippingCity,
    string? ShippingPostalCode,
    string? ShippingCountry,
    string? ShippingPhone,
    string? BillingName,
    string? BillingAddress,
    string? BillingCity,
    string? BillingPostalCode,
    string? BillingCountry,
    Guid? ShippingMethodId,
    string? CouponCode
);

[GraphQLName("ShopCreateOrderItemInput")]
public record CreateOrderItemInput(
    Guid ProductId,
    Guid? VariantId,
    int Quantity
);

[GraphQLName("ShopUpdateOrderStatusInput")]
public record UpdateOrderStatusInput(
    Guid OrderId,
    string Status,
    string? TrackingNumber,
    string? InternalNotes
);

// Cart DTOs
public record CartDto(
    Guid Id,
    Guid? CustomerId,
    string? SessionId,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    string Currency,
    string? CouponCode,
    decimal DiscountAmount,
    List<CartItemDto> Items,
    DateTime CreatedAt
);

public record CartItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductImage,
    Guid? VariantId,
    int Quantity,
    decimal UnitPrice,
    decimal Total
);

public record AddToCartInput(
    Guid? CartId,
    Guid? CustomerId,
    string? SessionId,
    Guid ProductId,
    Guid? VariantId,
    int Quantity
);

public record UpdateCartItemInput(
    Guid CartItemId,
    int Quantity
);

public record ApplyCouponInput(
    Guid CartId,
    string CouponCode
);

// Payment DTOs
public record PaymentDto(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    string Currency,
    string Method,
    string Status,
    string? TransactionId,
    DateTime CreatedAt,
    DateTime? ProcessedAt
);

public record CreatePaymentInput(
    Guid OrderId,
    decimal Amount,
    string Currency,
    string Method,
    string? TransactionId
);

// Shipping DTOs
public record ShippingMethodDto(
    Guid Id,
    string Name,
    string? Description,
    string? Code,
    string? Carrier,
    decimal Price,
    decimal? FreeShippingThreshold,
    int? EstimatedDeliveryDays,
    bool IsActive
);

public record CreateShippingMethodInput(
    string Name,
    string? Description,
    string? Code,
    string? Carrier,
    decimal Price,
    decimal? FreeShippingThreshold,
    int? EstimatedDeliveryDays,
    bool IsActive,
    int SortOrder,
    string? AvailableCountries,
    decimal? MaxWeight
);

// Coupon DTOs
public record CouponDto(
    Guid Id,
    string Code,
    string? Description,
    string Type,
    decimal Value,
    decimal? MinimumOrderAmount,
    decimal? MaximumDiscountAmount,
    int? UsageLimit,
    int UsageCount,
    bool IsActive,
    DateTime? StartsAt,
    DateTime? ExpiresAt
);

public record CreateCouponInput(
    string Code,
    string? Description,
    string Type,
    decimal Value,
    decimal? MinimumOrderAmount,
    decimal? MaximumDiscountAmount,
    int? UsageLimit,
    int? UsageLimitPerCustomer,
    bool IsActive,
    DateTime? StartsAt,
    DateTime? ExpiresAt,
    string? ApplicableCategories,
    string? ApplicableProducts
);

// Inventory DTOs
public record InventoryAdjustmentInput(
    Guid ProductId,
    Guid? VariantId,
    int QuantityChange,
    string Type,
    string? Reason,
    string? Reference
);

public record InventoryMovementDto(
    Guid Id,
    Guid ProductId,
    Guid? VariantId,
    string Type,
    int Quantity,
    int QuantityBefore,
    int QuantityAfter,
    string? Reason,
    DateTime CreatedAt
);
