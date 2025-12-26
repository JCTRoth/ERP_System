using MasterdataService.Models;
using MasterdataService.Services;
using HotChocolate;

namespace MasterdataService.GraphQL;

public class Query
{
    // Customer Queries
    [GraphQLDescription("Get a customer by ID")]
    [Query]
    public async Task<Customer?> GetCustomer(
        string id,
        [Service] ICustomerService customerService)
    {
        if (Guid.TryParse(id, out var guid))
        {
            return await customerService.GetByIdAsync(guid);
        }
        return null;
    }

    [GraphQLDescription("Get a customer by number")]
    public async Task<Customer?> GetCustomerByNumber(
        string customerNumber,
        [Service] ICustomerService customerService)
    {
        return await customerService.GetByNumberAsync(customerNumber);
    }

    [GraphQLDescription("Get all customers with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Customer>> GetCustomers(
        [Service] ICustomerService customerService)
    {
        return await customerService.GetAllAsync();
    }

    [GraphQLDescription("Search customers")]
    [Query]
    public static async Task<IEnumerable<Customer>> SearchCustomers(
        string query,
        [Service] ICustomerService customerService)
    {
        return await customerService.SearchAsync(query);
    }

    // Supplier Queries
    [GraphQLDescription("Get a supplier by ID")]
    public static async Task<Supplier?> GetSupplier(
        Guid id,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get a supplier by number")]
    public static async Task<Supplier?> GetSupplierByNumber(
        string supplierNumber,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetByNumberAsync(supplierNumber);
    }

    [GraphQLDescription("Get all suppliers with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Supplier>> GetSuppliers(
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetAllAsync();
    }

    [GraphQLDescription("Get preferred suppliers")]
    public static async Task<IEnumerable<Supplier>> GetPreferredSuppliers(
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetByRatingAsync(SupplierRating.Preferred);
    }

    // Employee Queries
    [GraphQLDescription("Get an employee by ID")]
    public static async Task<Employee?> GetEmployee(
        Guid id,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an employee by number")]
    public static async Task<Employee?> GetEmployeeByNumber(
        string employeeNumber,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByNumberAsync(employeeNumber);
    }

    [GraphQLDescription("Get all employees with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Employee>> GetEmployees(
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetAllAsync();
    }

    [GraphQLDescription("Get employees by department")]
    public static async Task<IEnumerable<Employee>> GetEmployeesByDepartment(
        Guid departmentId,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByDepartmentAsync(departmentId);
    }

    [GraphQLDescription("Get direct reports")]
    public static async Task<IEnumerable<Employee>> GetDirectReports(
        Guid managerId,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByManagerAsync(managerId);
    }

    // Department Queries
    [GraphQLDescription("Get a department by ID")]
    public async Task<Department?> GetDepartment(
        Guid id,
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all departments with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Department>> GetDepartments(
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.GetAllAsync();
    }

    [GraphQLDescription("Get department hierarchy")]
    public async Task<IEnumerable<Department>> GetDepartmentHierarchy(
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.GetHierarchyAsync();
    }

    // Cost Center Queries
    [GraphQLDescription("Get a cost center by ID")]
    public static async Task<CostCenter?> GetCostCenter(
        Guid id,
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all cost centers")]
    public static async Task<IEnumerable<CostCenter>> GetCostCenters(
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.GetAllAsync();
    }

    // Location Queries
    [GraphQLDescription("Get a location by ID")]
    public static async Task<BusinessLocation?> GetLocation(
        Guid id,
        [Service] ILocationService locationService)
    {
        return await locationService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all locations")]
    public static async Task<IEnumerable<BusinessLocation>> GetLocations(
        [Service] ILocationService locationService)
    {
        return await locationService.GetAllAsync();
    }

    // Asset Queries
    [GraphQLDescription("Get an asset by ID")]
    public static async Task<Asset?> GetAsset(
        Guid id,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an asset by number")]
    public static async Task<Asset?> GetAssetByNumber(
        string assetNumber,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByNumberAsync(assetNumber);
    }

    [GraphQLDescription("Get all assets with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Asset>> GetAssets(
        [Service] IAssetService assetService)
    {
        return await assetService.GetAllAsync();
    }

    [GraphQLDescription("Get assets by assignee")]
    public static async Task<IEnumerable<Asset>> GetAssetsByAssignee(
        Guid employeeId,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByAssigneeAsync(employeeId);
    }

    [GraphQLDescription("Get asset categories")]
    public static async Task<IEnumerable<AssetCategory>> GetAssetCategories(
        [Service] IAssetCategoryService assetCategoryService)
    {
        return await assetCategoryService.GetAllAsync();
    }

    // Reference Data Queries
    [GraphQLDescription("Get all currencies with pagination")]
    [UsePaging(IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public async Task<IEnumerable<Currency>> GetCurrencies(
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.GetCurrenciesAsync();
    }

    [GraphQLDescription("Get currency by code")]
    public async Task<Currency?> GetCurrency(
        string code,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.GetCurrencyByCodeAsync(code);
    }

    [GraphQLDescription("Get all payment terms")]
    public async Task<IEnumerable<PaymentTerm>> GetPaymentTerms(
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.GetPaymentTermsAsync();
    }

    [GraphQLDescription("Get all units of measure")]
    public async Task<IEnumerable<UnitOfMeasure>> GetUnitsOfMeasure(
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.GetUnitsOfMeasureAsync();
    }

    [GraphQLDescription("Get all tax codes")]
    public async Task<IEnumerable<TaxCode>> GetTaxCodes(
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.GetTaxCodesAsync();
    }

    [GraphQLDescription("Convert units")]
    public async Task<decimal> ConvertUnits(
        decimal amount,
        Guid fromUnitId,
        Guid toUnitId,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.ConvertUnitsAsync(amount, fromUnitId, toUnitId);
    }
}
