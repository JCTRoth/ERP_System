using MasterdataService.Models;
using MasterdataService.Services;
using MasterdataService.DTOs;
using HotChocolate.Subscriptions;

namespace MasterdataService.GraphQL;

public class Mutation
{
    // Customer Mutations
    [GraphQLDescription("Create a new customer")]
    public async Task<Customer> CreateCustomer(
        CreateCustomerInput input,
        [Service] ICustomerService customerService,
        [Service] ITopicEventSender eventSender)
    {
        var customer = await customerService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnCustomerCreated), customer);
        return customer;
    }

    [GraphQLDescription("Update a customer")]
    public async Task<Customer?> UpdateCustomer(
        Guid id,
        UpdateCustomerInput input,
        [Service] ICustomerService customerService)
    {
        return await customerService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete a customer")]
    public async Task<bool> DeleteCustomer(
        Guid id,
        [Service] ICustomerService customerService)
    {
        return await customerService.DeleteAsync(id);
    }

    [GraphQLDescription("Add address to customer")]
    public async Task<Address> AddCustomerAddress(
        Guid customerId,
        CreateAddressInput input,
        [Service] ICustomerService customerService)
    {
        return await customerService.AddAddressAsync(customerId, input);
    }

    [GraphQLDescription("Add contact to customer")]
    public async Task<Contact> AddCustomerContact(
        Guid customerId,
        CreateContactInput input,
        [Service] ICustomerService customerService)
    {
        return await customerService.AddContactAsync(customerId, input);
    }

    // Supplier Mutations
    [GraphQLDescription("Create a new supplier")]
    public async Task<Supplier> CreateSupplier(
        CreateSupplierInput input,
        [Service] ISupplierService supplierService,
        [Service] ITopicEventSender eventSender)
    {
        var supplier = await supplierService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnSupplierCreated), supplier);
        return supplier;
    }

    [GraphQLDescription("Update a supplier")]
    public async Task<Supplier?> UpdateSupplier(
        Guid id,
        UpdateSupplierInput input,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete a supplier")]
    public async Task<bool> DeleteSupplier(
        Guid id,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.DeleteAsync(id);
    }

    [GraphQLDescription("Add address to supplier")]
    public async Task<Address> AddSupplierAddress(
        Guid supplierId,
        CreateAddressInput input,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.AddAddressAsync(supplierId, input);
    }

    [GraphQLDescription("Add contact to supplier")]
    public async Task<Contact> AddSupplierContact(
        Guid supplierId,
        CreateContactInput input,
        [Service] ISupplierService supplierService)
    {
        return await supplierService.AddContactAsync(supplierId, input);
    }

    // Employee Mutations
    [GraphQLDescription("Create a new employee")]
    public async Task<Employee> CreateEmployee(
        CreateEmployeeInput input,
        [Service] IEmployeeService employeeService,
        [Service] ITopicEventSender eventSender)
    {
        var employee = await employeeService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnEmployeeCreated), employee);
        return employee;
    }

    [GraphQLDescription("Update an employee")]
    public async Task<Employee?> UpdateEmployee(
        Guid id,
        UpdateEmployeeInput input,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Terminate an employee")]
    public async Task<Employee?> TerminateEmployee(
        Guid id,
        DateTime terminationDate,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.TerminateAsync(id, terminationDate);
    }

    [GraphQLDescription("Delete an employee")]
    public async Task<bool> DeleteEmployee(
        Guid id,
        [Service] IEmployeeService employeeService)
    {
        return await employeeService.DeleteAsync(id);
    }

    // Department Mutations
    [GraphQLDescription("Create a new department")]
    public async Task<Department> CreateDepartment(
        CreateDepartmentInput input,
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.CreateAsync(input);
    }

    [GraphQLDescription("Update a department")]
    public async Task<Department?> UpdateDepartment(
        Guid id,
        UpdateDepartmentInput input,
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete a department")]
    public async Task<bool> DeleteDepartment(
        Guid id,
        [Service] IDepartmentService departmentService)
    {
        return await departmentService.DeleteAsync(id);
    }

    // Cost Center Mutations
    [GraphQLDescription("Create a new cost center")]
    public async Task<CostCenter> CreateCostCenter(
        CreateCostCenterInput input,
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.CreateAsync(input);
    }

    [GraphQLDescription("Update a cost center")]
    public async Task<CostCenter?> UpdateCostCenter(
        Guid id,
        UpdateCostCenterInput input,
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete a cost center")]
    public async Task<bool> DeleteCostCenter(
        Guid id,
        [Service] ICostCenterService costCenterService)
    {
        return await costCenterService.DeleteAsync(id);
    }

    // Location Mutations
    [GraphQLDescription("Create a new location")]
    public async Task<BusinessLocation> CreateLocation(
        CreateLocationInput input,
        [Service] ILocationService locationService)
    {
        return await locationService.CreateAsync(input);
    }

    [GraphQLDescription("Update a location")]
    public async Task<BusinessLocation?> UpdateLocation(
        Guid id,
        UpdateLocationInput input,
        [Service] ILocationService locationService)
    {
        return await locationService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Delete a location")]
    public async Task<bool> DeleteLocation(
        Guid id,
        [Service] ILocationService locationService)
    {
        return await locationService.DeleteAsync(id);
    }

    // Asset Mutations
    [GraphQLDescription("Create a new asset")]
    public async Task<Asset> CreateAsset(
        CreateAssetInput input,
        [Service] IAssetService assetService,
        [Service] ITopicEventSender eventSender)
    {
        var asset = await assetService.CreateAsync(input);
        await eventSender.SendAsync(nameof(Subscription.OnAssetCreated), asset);
        return asset;
    }

    [GraphQLDescription("Update an asset")]
    public async Task<Asset?> UpdateAsset(
        Guid id,
        UpdateAssetInput input,
        [Service] IAssetService assetService)
    {
        return await assetService.UpdateAsync(id, input);
    }

    [GraphQLDescription("Assign asset to employee")]
    public async Task<Asset?> AssignAsset(
        Guid id,
        Guid employeeId,
        [Service] IAssetService assetService)
    {
        return await assetService.AssignToAsync(id, employeeId);
    }

    [GraphQLDescription("Transfer asset to location")]
    public async Task<Asset?> TransferAsset(
        Guid id,
        Guid locationId,
        Guid? departmentId,
        [Service] IAssetService assetService)
    {
        return await assetService.TransferAsync(id, locationId, departmentId);
    }

    [GraphQLDescription("Dispose an asset")]
    public async Task<Asset?> DisposeAsset(
        Guid id,
        DisposeAssetInput input,
        [Service] IAssetService assetService)
    {
        return await assetService.DisposeAsync(id, input);
    }

    [GraphQLDescription("Calculate asset depreciation")]
    public async Task<decimal> CalculateDepreciation(
        Guid id,
        [Service] IAssetService assetService)
    {
        return await assetService.CalculateDepreciationAsync(id);
    }

    // Asset Category Mutations
    [GraphQLDescription("Create an asset category")]
    public async Task<AssetCategory> CreateAssetCategory(
        CreateAssetCategoryInput input,
        [Service] IAssetCategoryService assetCategoryService)
    {
        return await assetCategoryService.CreateAsync(input);
    }

    // Reference Data Mutations
    [GraphQLDescription("Create a currency")]
    public async Task<Currency> CreateCurrency(
        CreateCurrencyInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.CreateCurrencyAsync(input);
    }

    [GraphQLDescription("Update a currency")]
    public async Task<Currency?> UpdateCurrency(
        Guid id,
        UpdateCurrencyInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.UpdateCurrencyAsync(id, input);
    }

    [GraphQLDescription("Create a payment term")]
    public async Task<PaymentTerm> CreatePaymentTerm(
        CreatePaymentTermInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.CreatePaymentTermAsync(input);
    }

    [GraphQLDescription("Create a unit of measure")]
    public async Task<UnitOfMeasure> CreateUnitOfMeasure(
        CreateUnitOfMeasureInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.CreateUnitOfMeasureAsync(input);
    }

    [GraphQLDescription("Create a tax code")]
    public async Task<TaxCode> CreateTaxCode(
        CreateTaxCodeInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.CreateTaxCodeAsync(input);
    }

    [GraphQLDescription("Update a tax code")]
    public async Task<TaxCode?> UpdateTaxCode(
        Guid id,
        UpdateTaxCodeInput input,
        [Service] IReferenceDataService referenceDataService)
    {
        return await referenceDataService.UpdateTaxCodeAsync(id, input);
    }
}
