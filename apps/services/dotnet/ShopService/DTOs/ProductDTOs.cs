namespace ShopService.DTOs;

// Product DTOs
public record ProductDto(
    Guid Id,
    string Name,
    string? Description,
    string Sku,
    string? Ean,
    decimal Price,
    decimal? CompareAtPrice,
    decimal CostPrice,
    int StockQuantity,
    string Status,
    bool IsFeatured,
    string? Slug,
    Guid? CategoryId,
    Guid? BrandId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateProductInput(
    string Name,
    string? Description,
    string Sku,
    string? Ean,
    decimal Price,
    decimal? CompareAtPrice,
    decimal CostPrice,
    int StockQuantity,
    int? LowStockThreshold,
    bool TrackInventory,
    bool AllowBackorder,
    decimal? Weight,
    string? WeightUnit,
    decimal? Length,
    decimal? Width,
    decimal? Height,
    string? DimensionUnit,
    Guid? CategoryId,
    Guid? BrandId,
    Guid? SupplierId,
    string Status,
    bool IsFeatured,
    bool IsDigital,
    string? Slug,
    string? MetaTitle,
    string? MetaDescription
);

public record UpdateProductInput(
    Guid? Id = null,
    string? Name = null,
    string? Description = null,
    string? Sku = null,
    string? Ean = null,
    decimal? Price = null,
    decimal? CompareAtPrice = null,
    decimal? CostPrice = null,
    int? StockQuantity = null,
    int? LowStockThreshold = null,
    bool? TrackInventory = null,
    bool? AllowBackorder = null,
    decimal? Weight = null,
    string? WeightUnit = null,
    decimal? Length = null,
    decimal? Width = null,
    decimal? Height = null,
    string? DimensionUnit = null,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    Guid? SupplierId = null,
    string? Status = null,
    bool? IsFeatured = null,
    bool? IsDigital = null,
    string? Slug = null,
    string? MetaTitle = null,
    string? MetaDescription = null
);

// Category DTOs
public record CategoryDto(
    Guid Id,
    string Name,
    string? Description,
    string? Slug,
    Guid? ParentCategoryId,
    int SortOrder,
    bool IsActive,
    string? ImageUrl,
    DateTime CreatedAt
);

public record CreateCategoryInput(
    string Name,
    string? Description,
    string? Slug,
    Guid? ParentCategoryId,
    int SortOrder,
    bool IsActive,
    string? ImageUrl
);

public record UpdateCategoryInput(
    Guid Id,
    string? Name,
    string? Description,
    string? Slug,
    Guid? ParentCategoryId,
    int? SortOrder,
    bool? IsActive,
    string? ImageUrl
);

// Brand DTOs
public record BrandDto(
    Guid Id,
    string Name,
    string? Description,
    string? Slug,
    string? LogoUrl,
    string? WebsiteUrl,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateBrandInput(
    string Name,
    string? Description,
    string? Slug,
    string? LogoUrl,
    string? WebsiteUrl,
    bool IsActive
);

public record UpdateBrandInput(
    Guid Id,
    string? Name,
    string? Description,
    string? Slug,
    string? LogoUrl,
    string? WebsiteUrl,
    bool? IsActive
);

// Supplier DTOs
public record SupplierDto(
    Guid Id,
    string Name,
    string? Code,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? City,
    string? Country,
    bool IsActive,
    DateTime CreatedAt
);

[GraphQLName("ShopCreateSupplierInput")]
public record CreateSupplierInput(
    string Name,
    string? Code,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? City,
    string? PostalCode,
    string? Country,
    string? VatNumber,
    int LeadTimeDays,
    string Currency,
    bool IsActive
);

[GraphQLName("ShopUpdateSupplierInput")]
public record UpdateSupplierInput(
    Guid Id,
    string? Name,
    string? Code,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? City,
    string? PostalCode,
    string? Country,
    string? VatNumber,
    int? LeadTimeDays,
    string? Currency,
    bool? IsActive
);
