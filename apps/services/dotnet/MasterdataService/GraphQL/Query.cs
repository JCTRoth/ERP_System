using MasterdataService.Models;
using MasterdataService.Services;

namespace MasterdataService.GraphQL;

public class Query
{
    // Customer Queries
    [GraphQLDescription("Get a customer by ID")]
    public async Task<Customer?> GetCustomer(
        Guid id,
        [Service] ICustomerService customerService)
    {
        return await customerService.GetByIdAsync(id);
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
        int skip,
        int take,
        [Service] ICustomerService customerService)
    {
        return await customerService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Search customers")]
    public async Task<IEnumerable<Customer>> SearchCustomers(
        string query,
        [Service] ICustomerService customerService)
    {
        return await customerService.SearchAsync(query);
    }

    // Supplier Queries
    [GraphQLDescription("Get a supplier by ID")]
    public async Task<Supplier?> GetSupplier(
        Guid id,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get a supplier by number")]
    public async Task<Supplier?> GetSupplierByNumber(
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
        int skip,
        int take,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Get preferred suppliers")]
    public async Task<IEnumerable<Supplier>> GetPreferredSuppliers(
        [Service] ISupplierService supplierService)
    {
        return await supplierService.GetByRatingAsync(SupplierRating.Preferred);
    }

    // Employee Queries
    [GraphQLDescription("Get an employee by ID")]
    public async Task<Employee?> GetEmployee(
        Guid id,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an employee by number")]
    public async Task<Employee?> GetEmployeeByNumber(
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
        int skip,
        int take,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Get employees by department")]
    public async Task<IEnumerable<Employee>> GetEmployeesByDepartment(
        Guid departmentId,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByDepartmentAsync(departmentId);
    }

    [GraphQLDescription("Get direct reports")]
    public async Task<IEnumerable<Employee>> GetDirectReports(
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

    [GraphQLDescription("Get all departments")]
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
    public async Task<CostCenter?> GetCostCenter(
        Guid id,
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all cost centers")]
    public async Task<IEnumerable<CostCenter>> GetCostCenters(
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.GetAllAsync();
    }

    // Location Queries
    [GraphQLDescription("Get a location by ID")]
    public async Task<Location?> GetLocation(
        Guid id,
        [Service] ILocationService locationService)
    {
        return await locationService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get all locations")]
    public async Task<IEnumerable<Location>> GetLocations(
        [Service] ILocationService locationService)
    {
        return await locationService.GetAllAsync();
    }

    // Asset Queries
    [GraphQLDescription("Get an asset by ID")]
    public async Task<Asset?> GetAsset(
        Guid id,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByIdAsync(id);
    }

    [GraphQLDescription("Get an asset by number")]
    public async Task<Asset?> GetAssetByNumber(
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
        int skip,
        int take,
        [Service] IAssetService assetService)
    {
        return await assetService.GetAllAsync(skip, take);
    }

    [GraphQLDescription("Get assets by assignee")]
    public async Task<IEnumerable<Asset>> GetAssetsByAssignee(
        Guid employeeId,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByAssigneeAsync(employeeId);
    }

    [GraphQLDescription("Get asset categories")]
    public async Task<IEnumerable<AssetCategory>> GetAssetCategories(
        [Service] IAssetCategoryService assetCategoryService)
    {
        return await assetCategoryService.GetAllAsync();
    }

    // Reference Data Queries
    [GraphQLDescription("Get all currencies")]
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
