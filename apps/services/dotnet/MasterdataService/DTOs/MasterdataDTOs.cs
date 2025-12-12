namespace MasterdataService.DTOs;

// Customer DTOs
public record CreateCustomerInput(
    string Name,
    string Type,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Fax,
    string? Website,
    string? TaxId,
    Guid? DefaultCurrencyId,
    Guid? DefaultPaymentTermId,
    decimal? CreditLimit,
    string? Notes,
    List<CreateAddressInput>? Addresses,
    List<CreateContactInput>? Contacts
);

public record UpdateCustomerInput(
    string? Name,
    string? Type,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Fax,
    string? Website,
    string? TaxId,
    Guid? DefaultCurrencyId,
    Guid? DefaultPaymentTermId,
    decimal? CreditLimit,
    string? Status,
    string? Notes
);

// Supplier DTOs
public record CreateSupplierInput(
    string Name,
    string Type,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Fax,
    string? Website,
    string? TaxId,
    Guid? DefaultCurrencyId,
    Guid? DefaultPaymentTermId,
    int? LeadTimeDays,
    decimal? MinimumOrderValue,
    string? Notes,
    List<CreateAddressInput>? Addresses,
    List<CreateContactInput>? Contacts
);

public record UpdateSupplierInput(
    string? Name,
    string? Type,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Fax,
    string? Website,
    string? TaxId,
    Guid? DefaultCurrencyId,
    Guid? DefaultPaymentTermId,
    int? LeadTimeDays,
    decimal? MinimumOrderValue,
    string? Status,
    string? Rating,
    string? Notes
);

// Address DTOs
public record CreateAddressInput(
    string Type,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    bool IsDefault
);

public record UpdateAddressInput(
    string? Type,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    bool? IsDefault
);

// Contact DTOs
public record CreateContactInput(
    string FirstName,
    string LastName,
    string? Title,
    string? Email,
    string? Phone,
    string? Mobile,
    string? Department,
    bool IsPrimary
);

public record UpdateContactInput(
    string? FirstName,
    string? LastName,
    string? Title,
    string? Email,
    string? Phone,
    string? Mobile,
    string? Department,
    bool? IsPrimary,
    bool? IsActive
);

// Bank Detail DTOs
public record CreateBankDetailInput(
    string BankName,
    string? AccountNumber,
    string? RoutingNumber,
    string? Iban,
    string? SwiftCode,
    string? Currency,
    bool IsDefault
);

// Employee DTOs
public record CreateEmployeeInput(
    string FirstName,
    string LastName,
    string? MiddleName,
    string? Email,
    string? PersonalEmail,
    string? Phone,
    string? Mobile,
    DateTime? DateOfBirth,
    string? Gender,
    string? Nationality,
    string? TaxId,
    DateTime HireDate,
    string EmploymentType,
    string? JobTitle,
    Guid? DepartmentId,
    Guid? ManagerId,
    Guid? CostCenterId,
    Guid? LocationId,
    decimal? Salary,
    string? SalaryType,
    string? Currency,
    Guid? UserId
);

public record UpdateEmployeeInput(
    string? FirstName,
    string? LastName,
    string? MiddleName,
    string? Email,
    string? PersonalEmail,
    string? Phone,
    string? Mobile,
    DateTime? DateOfBirth,
    string? Gender,
    string? Nationality,
    string? TaxId,
    DateTime? TerminationDate,
    string? EmploymentType,
    string? Status,
    string? JobTitle,
    Guid? DepartmentId,
    Guid? ManagerId,
    Guid? CostCenterId,
    Guid? LocationId,
    decimal? Salary,
    string? SalaryType,
    string? Currency
);

// Department DTOs
public record CreateDepartmentInput(
    string Code,
    string Name,
    string? Description,
    Guid? ParentDepartmentId,
    Guid? ManagerId,
    Guid? CostCenterId
);

public record UpdateDepartmentInput(
    string? Name,
    string? Description,
    Guid? ParentDepartmentId,
    Guid? ManagerId,
    Guid? CostCenterId,
    bool? IsActive
);

// CostCenter DTOs
public record CreateCostCenterInput(
    string Code,
    string Name,
    string? Description,
    string? Type,
    Guid? ParentCostCenterId,
    Guid? ResponsiblePersonId,
    decimal? Budget,
    string? Currency
);

public record UpdateCostCenterInput(
    string? Name,
    string? Description,
    string? Type,
    Guid? ParentCostCenterId,
    Guid? ResponsiblePersonId,
    decimal? Budget,
    string? Currency,
    bool? IsActive
);

// Location DTOs
public record CreateLocationInput(
    string Code,
    string Name,
    string? Description,
    string? Type,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    string? Phone,
    string? Timezone,
    Guid? ParentLocationId
);

public record UpdateLocationInput(
    string? Name,
    string? Description,
    string? Type,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    string? Phone,
    string? Timezone,
    Guid? ParentLocationId,
    bool? IsActive
);

// Asset DTOs
public record CreateAssetInput(
    string Name,
    string? Description,
    string? Type,
    Guid? CategoryId,
    decimal PurchasePrice,
    DateTime PurchaseDate,
    decimal? SalvageValue,
    int UsefulLifeMonths,
    string? DepreciationMethod,
    string? Currency,
    string? SerialNumber,
    string? Barcode,
    string? Manufacturer,
    string? Model,
    Guid? AssignedToId,
    Guid? DepartmentId,
    Guid? LocationId,
    Guid? CostCenterId,
    DateTime? WarrantyExpiry,
    string? Notes
);

public record UpdateAssetInput(
    string? Name,
    string? Description,
    string? Type,
    string? Status,
    Guid? CategoryId,
    decimal? CurrentValue,
    decimal? SalvageValue,
    int? UsefulLifeMonths,
    string? DepreciationMethod,
    string? SerialNumber,
    string? Barcode,
    string? Manufacturer,
    string? Model,
    Guid? AssignedToId,
    Guid? DepartmentId,
    Guid? LocationId,
    Guid? CostCenterId,
    DateTime? WarrantyExpiry,
    DateTime? LastMaintenanceDate,
    DateTime? NextMaintenanceDate,
    string? Notes
);

public record DisposeAssetInput(
    decimal DisposalValue,
    string? DisposalReason
);

// Asset Category DTOs
public record CreateAssetCategoryInput(
    string Code,
    string Name,
    string? Description,
    Guid? ParentCategoryId,
    int? DefaultUsefulLifeMonths,
    string? DefaultDepreciationMethod
);

// Currency DTOs
public record CreateCurrencyInput(
    string Code,
    string Name,
    string? Symbol,
    int DecimalPlaces,
    decimal ExchangeRate,
    bool IsBaseCurrency
);

public record UpdateCurrencyInput(
    string? Name,
    string? Symbol,
    decimal? ExchangeRate,
    bool? IsActive
);

// Payment Term DTOs
public record CreatePaymentTermInput(
    string Code,
    string Name,
    string? Description,
    int DueDays,
    decimal? DiscountPercent,
    int? DiscountDays,
    string? Type
);

// Unit of Measure DTOs
public record CreateUnitOfMeasureInput(
    string Code,
    string Name,
    string? Symbol,
    string Type,
    Guid? BaseUnitId,
    decimal ConversionFactor,
    bool IsBaseUnit
);

// Tax Code DTOs
public record CreateTaxCodeInput(
    string Code,
    string Name,
    string? Description,
    decimal Rate,
    string Type,
    string? TaxAuthority,
    bool IsDefault,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo
);

public record UpdateTaxCodeInput(
    string? Name,
    string? Description,
    decimal? Rate,
    string? TaxAuthority,
    bool? IsActive,
    bool? IsDefault,
    DateTime? EffectiveTo
);
