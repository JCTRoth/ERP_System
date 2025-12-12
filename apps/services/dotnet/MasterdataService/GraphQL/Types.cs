using MasterdataService.Models;
using MasterdataService.Services;
using MasterdataService.Data;
using Microsoft.EntityFrameworkCore;

namespace MasterdataService.GraphQL;

[ExtendObjectType(typeof(Customer))]
public class CustomerType
{
    [GraphQLDescription("Get customer addresses")]
    public async Task<IEnumerable<Address>> GetAddresses(
        [Parent] Customer customer,
        [Service] MasterdataDbContext context)
    {
        return await context.Addresses
            .Where(a => a.CustomerId == customer.Id)
            .OrderBy(a => a.Type)
            .ToListAsync();
    }

    [GraphQLDescription("Get customer contacts")]
    public async Task<IEnumerable<Contact>> GetContacts(
        [Parent] Customer customer,
        [Service] MasterdataDbContext context)
    {
        return await context.Contacts
            .Where(c => c.CustomerId == customer.Id)
            .OrderByDescending(c => c.IsPrimary)
            .ToListAsync();
    }

    [GraphQLDescription("Get primary contact")]
    public async Task<Contact?> GetPrimaryContact(
        [Parent] Customer customer,
        [Service] MasterdataDbContext context)
    {
        return await context.Contacts
            .FirstOrDefaultAsync(c => c.CustomerId == customer.Id && c.IsPrimary);
    }

    [GraphQLDescription("Get default address")]
    public async Task<Address?> GetDefaultAddress(
        [Parent] Customer customer,
        [Service] MasterdataDbContext context)
    {
        return await context.Addresses
            .FirstOrDefaultAsync(a => a.CustomerId == customer.Id && a.IsDefault);
    }
}

[ExtendObjectType(typeof(Supplier))]
public class SupplierType
{
    [GraphQLDescription("Get supplier addresses")]
    public async Task<IEnumerable<Address>> GetAddresses(
        [Parent] Supplier supplier,
        [Service] MasterdataDbContext context)
    {
        return await context.Addresses
            .Where(a => a.SupplierId == supplier.Id)
            .OrderBy(a => a.Type)
            .ToListAsync();
    }

    [GraphQLDescription("Get supplier contacts")]
    public async Task<IEnumerable<Contact>> GetContacts(
        [Parent] Supplier supplier,
        [Service] MasterdataDbContext context)
    {
        return await context.Contacts
            .Where(c => c.SupplierId == supplier.Id)
            .OrderByDescending(c => c.IsPrimary)
            .ToListAsync();
    }
}

[ExtendObjectType(typeof(Employee))]
public class EmployeeType
{
    [GraphQLDescription("Get employee's department")]
    public async Task<Department?> GetDepartment(
        [Parent] Employee employee,
        [Service] IDepartmentService departmentService)
    {
        if (employee.DepartmentId == null) return null;
        return await departmentService.GetByIdAsync(employee.DepartmentId.Value);
    }

    [GraphQLDescription("Get employee's manager")]
    public async Task<Employee?> GetManager(
        [Parent] Employee employee,
        [Service] IEmployeeService employeeService)
    {
        if (employee.ManagerId == null) return null;
        return await employeeService.GetByIdAsync(employee.ManagerId.Value);
    }

    [GraphQLDescription("Get direct reports")]
    public async Task<IEnumerable<Employee>> GetDirectReports(
        [Parent] Employee employee,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByManagerAsync(employee.Id);
    }

    [GraphQLDescription("Get assigned assets")]
    public async Task<IEnumerable<Asset>> GetAssignedAssets(
        [Parent] Employee employee,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByAssigneeAsync(employee.Id);
    }
}

[ExtendObjectType(typeof(Department))]
public class DepartmentType
{
    [GraphQLDescription("Get department manager")]
    public async Task<Employee?> GetManager(
        [Parent] Department department,
        [Service] IEmployeeService employeeService)
    {
        if (department.ManagerId == null) return null;
        return await employeeService.GetByIdAsync(department.ManagerId.Value);
    }

    [GraphQLDescription("Get department employees")]
    public async Task<IEnumerable<Employee>> GetEmployees(
        [Parent] Department department,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.GetByDepartmentAsync(department.Id);
    }

    [GraphQLDescription("Get employee count")]
    public async Task<int> GetEmployeeCount(
        [Parent] Department department,
        [Service] MasterdataDbContext context)
    {
        return await context.Employees
            .CountAsync(e => e.DepartmentId == department.Id && e.Status == EmployeeStatus.Active);
    }
}

[ExtendObjectType(typeof(Asset))]
public class AssetType
{
    [GraphQLDescription("Get assigned employee")]
    public async Task<Employee?> GetAssignedTo(
        [Parent] Asset asset,
        [Service] IEmployeeService employeeService)
    {
        if (asset.AssignedToId == null) return null;
        return await employeeService.GetByIdAsync(asset.AssignedToId.Value);
    }

    [GraphQLDescription("Get asset category")]
    public async Task<AssetCategory?> GetCategory(
        [Parent] Asset asset,
        [Service] IAssetCategoryService assetCategoryService)
    {
        if (asset.CategoryId == null) return null;
        return await assetCategoryService.GetByIdAsync(asset.CategoryId.Value);
    }

    [GraphQLDescription("Get asset location")]
    public async Task<BusinessLocation?> GetLocation(
        [Parent] Asset asset,
        [Service] ILocationService locationService)
    {
        if (asset.LocationId == null) return null;
        return await locationService.GetByIdAsync(asset.LocationId.Value);
    }

    [GraphQLDescription("Get net book value")]
    public decimal GetNetBookValue([Parent] Asset asset)
    {
        return asset.PurchasePrice - asset.AccumulatedDepreciation;
    }

    [GraphQLDescription("Check if warranty is active")]
    public bool IsWarrantyActive([Parent] Asset asset)
    {
        return asset.WarrantyExpiry.HasValue && asset.WarrantyExpiry > DateTime.UtcNow;
    }

    [GraphQLDescription("Check if maintenance is due")]
    public bool IsMaintenanceDue([Parent] Asset asset)
    {
        return asset.NextMaintenanceDate.HasValue && asset.NextMaintenanceDate <= DateTime.UtcNow;
    }
}

[ExtendObjectType(typeof(BusinessLocation))]
public class LocationType
{
    [GraphQLDescription("Get employees at location")]
    public async Task<IEnumerable<Employee>> GetEmployees(
        [Parent] BusinessLocation location,
        [Service] MasterdataDbContext context)
    {
        return await context.Employees
            .Where(e => e.LocationId == location.Id && e.Status == EmployeeStatus.Active)
            .ToListAsync();
    }

    [GraphQLDescription("Get assets at location")]
    public async Task<IEnumerable<Asset>> GetAssets(
        [Parent] BusinessLocation location,
        [Service] IAssetService assetService)
    {
        return await assetService.GetByLocationAsync(location.Id);
    }
}
