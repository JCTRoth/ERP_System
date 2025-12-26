using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.DTOs;
using MasterdataService.Models;

namespace MasterdataService.Services;

public interface IEmployeeService
{
    Task<Employee?> GetByIdAsync(Guid id);
    Task<Employee?> GetByNumberAsync(string employeeNumber);
    Task<IEnumerable<Employee>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Employee>> GetAllAsync();
    Task<IEnumerable<Employee>> GetByDepartmentAsync(Guid departmentId);
    Task<IEnumerable<Employee>> GetByManagerAsync(Guid managerId);
    Task<IEnumerable<Employee>> SearchAsync(string query);
    Task<Employee> CreateAsync(CreateEmployeeInput input);
    Task<Employee?> UpdateAsync(Guid id, UpdateEmployeeInput input);
    Task<Employee?> TerminateAsync(Guid id, DateTime terminationDate);
    Task<bool> DeleteAsync(Guid id);
}

public class EmployeeService : IEmployeeService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<EmployeeService> _logger;

    public EmployeeService(MasterdataDbContext context, ILogger<EmployeeService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Employee?> GetByIdAsync(Guid id)
    {
        return await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Manager)
            .Include(e => e.CostCenter)
            .Include(e => e.Location)
            .Include(e => e.Addresses)
            .Include(e => e.DirectReports)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<Employee?> GetByNumberAsync(string employeeNumber)
    {
        return await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Manager)
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);
    }

    public async Task<IEnumerable<Employee>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.Status == EmployeeStatus.Active)
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Employee>> GetAllAsync()
    {
        return await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.Status == EmployeeStatus.Active)
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .ToListAsync();
    }

    public async Task<IEnumerable<Employee>> GetByDepartmentAsync(Guid departmentId)
    {
        return await _context.Employees
            .Where(e => e.DepartmentId == departmentId && e.Status == EmployeeStatus.Active)
            .OrderBy(e => e.LastName)
            .ToListAsync();
    }

    public async Task<IEnumerable<Employee>> GetByManagerAsync(Guid managerId)
    {
        return await _context.Employees
            .Where(e => e.ManagerId == managerId && e.Status == EmployeeStatus.Active)
            .OrderBy(e => e.LastName)
            .ToListAsync();
    }

    public async Task<IEnumerable<Employee>> SearchAsync(string query)
    {
        return await _context.Employees
            .Where(e => e.FirstName.Contains(query) ||
                       e.LastName.Contains(query) ||
                       e.EmployeeNumber.Contains(query) ||
                       (e.Email != null && e.Email.Contains(query)))
            .OrderBy(e => e.LastName)
            .Take(50)
            .ToListAsync();
    }

    public async Task<Employee> CreateAsync(CreateEmployeeInput input)
    {
        var employeeNumber = await GenerateEmployeeNumberAsync();

        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            EmployeeNumber = employeeNumber,
            FirstName = input.FirstName,
            LastName = input.LastName,
            MiddleName = input.MiddleName,
            Email = input.Email,
            PersonalEmail = input.PersonalEmail,
            Phone = input.Phone,
            Mobile = input.Mobile,
            DateOfBirth = input.DateOfBirth,
            Gender = !string.IsNullOrEmpty(input.Gender)
                ? Enum.Parse<Gender>(input.Gender)
                : null,
            Nationality = input.Nationality,
            TaxId = input.TaxId,
            HireDate = input.HireDate,
            EmploymentType = Enum.Parse<EmploymentType>(input.EmploymentType),
            Status = EmployeeStatus.Active,
            JobTitle = input.JobTitle,
            DepartmentId = input.DepartmentId,
            ManagerId = input.ManagerId,
            CostCenterId = input.CostCenterId,
            LocationId = input.LocationId,
            Salary = input.Salary,
            SalaryType = !string.IsNullOrEmpty(input.SalaryType)
                ? Enum.Parse<SalaryType>(input.SalaryType)
                : SalaryType.Monthly,
            Currency = input.Currency ?? "USD",
            UserId = input.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Employee created: {EmployeeNumber} - {FullName}",
            employeeNumber, employee.FullName);

        return employee;
    }

    public async Task<Employee?> UpdateAsync(Guid id, UpdateEmployeeInput input)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return null;

        if (!string.IsNullOrEmpty(input.FirstName))
            employee.FirstName = input.FirstName;

        if (!string.IsNullOrEmpty(input.LastName))
            employee.LastName = input.LastName;

        if (input.MiddleName != null)
            employee.MiddleName = input.MiddleName;

        if (input.Email != null)
            employee.Email = input.Email;

        if (input.PersonalEmail != null)
            employee.PersonalEmail = input.PersonalEmail;

        if (input.Phone != null)
            employee.Phone = input.Phone;

        if (input.Mobile != null)
            employee.Mobile = input.Mobile;

        if (input.DateOfBirth.HasValue)
            employee.DateOfBirth = input.DateOfBirth;

        if (!string.IsNullOrEmpty(input.Gender))
            employee.Gender = Enum.Parse<Gender>(input.Gender);

        if (input.Nationality != null)
            employee.Nationality = input.Nationality;

        if (input.TaxId != null)
            employee.TaxId = input.TaxId;

        if (input.TerminationDate.HasValue)
            employee.TerminationDate = input.TerminationDate;

        if (!string.IsNullOrEmpty(input.EmploymentType))
            employee.EmploymentType = Enum.Parse<EmploymentType>(input.EmploymentType);

        if (!string.IsNullOrEmpty(input.Status))
            employee.Status = Enum.Parse<EmployeeStatus>(input.Status);

        if (input.JobTitle != null)
            employee.JobTitle = input.JobTitle;

        if (input.DepartmentId.HasValue)
            employee.DepartmentId = input.DepartmentId;

        if (input.ManagerId.HasValue)
            employee.ManagerId = input.ManagerId;

        if (input.CostCenterId.HasValue)
            employee.CostCenterId = input.CostCenterId;

        if (input.LocationId.HasValue)
            employee.LocationId = input.LocationId;

        if (input.Salary.HasValue)
            employee.Salary = input.Salary;

        if (!string.IsNullOrEmpty(input.SalaryType))
            employee.SalaryType = Enum.Parse<SalaryType>(input.SalaryType);

        if (!string.IsNullOrEmpty(input.Currency))
            employee.Currency = input.Currency;

        employee.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Employee updated: {EmployeeNumber}", employee.EmployeeNumber);

        return employee;
    }

    public async Task<Employee?> TerminateAsync(Guid id, DateTime terminationDate)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return null;

        employee.Status = EmployeeStatus.Terminated;
        employee.TerminationDate = terminationDate;
        employee.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Employee terminated: {EmployeeNumber}", employee.EmployeeNumber);

        return employee;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return false;

        // Check if employee is a manager
        var hasReports = await _context.Employees
            .AnyAsync(e => e.ManagerId == id);

        if (hasReports)
        {
            _logger.LogWarning("Cannot delete employee {EmployeeNumber} - has direct reports",
                employee.EmployeeNumber);
            return false;
        }

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Employee deleted: {EmployeeNumber}", employee.EmployeeNumber);

        return true;
    }

    private async Task<string> GenerateEmployeeNumberAsync()
    {
        var lastEmployee = await _context.Employees
            .OrderByDescending(e => e.EmployeeNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastEmployee != null)
        {
            var lastNum = lastEmployee.EmployeeNumber.Replace("EMP-", "");
            if (int.TryParse(lastNum, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"EMP-{sequence:D6}";
    }
}

public interface IDepartmentService
{
    Task<Department?> GetByIdAsync(Guid id);
    Task<IEnumerable<Department>> GetAllAsync();
    Task<IEnumerable<Department>> GetHierarchyAsync();
    Task<Department> CreateAsync(CreateDepartmentInput input);
    Task<Department?> UpdateAsync(Guid id, UpdateDepartmentInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class DepartmentService : IDepartmentService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<DepartmentService> _logger;

    public DepartmentService(MasterdataDbContext context, ILogger<DepartmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Department?> GetByIdAsync(Guid id)
    {
        return await _context.Departments
            .Include(d => d.Manager)
            .Include(d => d.CostCenter)
            .Include(d => d.SubDepartments)
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == id);
    }

    public async Task<IEnumerable<Department>> GetAllAsync()
    {
        return await _context.Departments
            .Include(d => d.Manager)
            .Where(d => d.IsActive)
            .OrderBy(d => d.Code)
            .ToListAsync();
    }

    public async Task<IEnumerable<Department>> GetHierarchyAsync()
    {
        return await _context.Departments
            .Where(d => d.ParentDepartmentId == null && d.IsActive)
            .Include(d => d.SubDepartments)
            .Include(d => d.Manager)
            .OrderBy(d => d.Code)
            .ToListAsync();
    }

    public async Task<Department> CreateAsync(CreateDepartmentInput input)
    {
        var department = new Department
        {
            Id = Guid.NewGuid(),
            Code = input.Code,
            Name = input.Name,
            Description = input.Description,
            ParentDepartmentId = input.ParentDepartmentId,
            ManagerId = input.ManagerId,
            CostCenterId = input.CostCenterId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Department created: {Code} - {Name}", input.Code, input.Name);

        return department;
    }

    public async Task<Department?> UpdateAsync(Guid id, UpdateDepartmentInput input)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            department.Name = input.Name;

        if (input.Description != null)
            department.Description = input.Description;

        if (input.ParentDepartmentId.HasValue)
            department.ParentDepartmentId = input.ParentDepartmentId;

        if (input.ManagerId.HasValue)
            department.ManagerId = input.ManagerId;

        if (input.CostCenterId.HasValue)
            department.CostCenterId = input.CostCenterId;

        if (input.IsActive.HasValue)
            department.IsActive = input.IsActive.Value;

        department.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return department;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null) return false;

        var hasEmployees = await _context.Employees
            .AnyAsync(e => e.DepartmentId == id);

        if (hasEmployees)
        {
            _logger.LogWarning("Cannot delete department {Code} - has employees", department.Code);
            return false;
        }

        department.IsActive = false;
        department.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}

public interface ICostCenterService
{
    Task<CostCenter?> GetByIdAsync(Guid id);
    Task<IEnumerable<CostCenter>> GetAllAsync();
    Task<IEnumerable<CostCenter>> GetHierarchyAsync();
    Task<CostCenter> CreateAsync(CreateCostCenterInput input);
    Task<CostCenter?> UpdateAsync(Guid id, UpdateCostCenterInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class CostCenterService : ICostCenterService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<CostCenterService> _logger;

    public CostCenterService(MasterdataDbContext context, ILogger<CostCenterService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<CostCenter?> GetByIdAsync(Guid id)
    {
        return await _context.CostCenters
            .Include(c => c.ResponsiblePerson)
            .Include(c => c.SubCostCenters)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<IEnumerable<CostCenter>> GetAllAsync()
    {
        return await _context.CostCenters
            .Where(c => c.IsActive)
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<IEnumerable<CostCenter>> GetHierarchyAsync()
    {
        return await _context.CostCenters
            .Where(c => c.ParentCostCenterId == null && c.IsActive)
            .Include(c => c.SubCostCenters)
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<CostCenter> CreateAsync(CreateCostCenterInput input)
    {
        var costCenter = new CostCenter
        {
            Id = Guid.NewGuid(),
            Code = input.Code,
            Name = input.Name,
            Description = input.Description,
            Type = !string.IsNullOrEmpty(input.Type)
                ? Enum.Parse<CostCenterType>(input.Type)
                : CostCenterType.Department,
            ParentCostCenterId = input.ParentCostCenterId,
            ResponsiblePersonId = input.ResponsiblePersonId,
            Budget = input.Budget,
            Currency = input.Currency ?? "USD",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.CostCenters.Add(costCenter);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cost center created: {Code} - {Name}", input.Code, input.Name);

        return costCenter;
    }

    public async Task<CostCenter?> UpdateAsync(Guid id, UpdateCostCenterInput input)
    {
        var costCenter = await _context.CostCenters.FindAsync(id);
        if (costCenter == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            costCenter.Name = input.Name;

        if (input.Description != null)
            costCenter.Description = input.Description;

        if (!string.IsNullOrEmpty(input.Type))
            costCenter.Type = Enum.Parse<CostCenterType>(input.Type);

        if (input.ParentCostCenterId.HasValue)
            costCenter.ParentCostCenterId = input.ParentCostCenterId;

        if (input.ResponsiblePersonId.HasValue)
            costCenter.ResponsiblePersonId = input.ResponsiblePersonId;

        if (input.Budget.HasValue)
            costCenter.Budget = input.Budget;

        if (!string.IsNullOrEmpty(input.Currency))
            costCenter.Currency = input.Currency;

        if (input.IsActive.HasValue)
            costCenter.IsActive = input.IsActive.Value;

        costCenter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return costCenter;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var costCenter = await _context.CostCenters.FindAsync(id);
        if (costCenter == null) return false;

        costCenter.IsActive = false;
        costCenter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}

public interface ILocationService
{
    Task<BusinessLocation?> GetByIdAsync(Guid id);
    Task<IEnumerable<BusinessLocation>> GetAllAsync();
    Task<IEnumerable<BusinessLocation>> GetHierarchyAsync();
    Task<BusinessLocation> CreateAsync(CreateLocationInput input);
    Task<BusinessLocation?> UpdateAsync(Guid id, UpdateLocationInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class LocationService : ILocationService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<LocationService> _logger;

    public LocationService(MasterdataDbContext context, ILogger<LocationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BusinessLocation?> GetByIdAsync(Guid id)
    {
        return await _context.Locations
            .Include(l => l.SubLocations)
            .Include(l => l.Employees)
            .FirstOrDefaultAsync(l => l.Id == id);
    }

    public async Task<IEnumerable<BusinessLocation>> GetAllAsync()
    {
        return await _context.Locations
            .Where(l => l.IsActive)
            .OrderBy(l => l.Code)
            .ToListAsync();
    }

    public async Task<IEnumerable<BusinessLocation>> GetHierarchyAsync()
    {
        return await _context.Locations
            .Where(l => l.ParentLocationId == null && l.IsActive)
            .Include(l => l.SubLocations)
            .OrderBy(l => l.Code)
            .ToListAsync();
    }

    public async Task<BusinessLocation> CreateAsync(CreateLocationInput input)
    {
        var location = new BusinessLocation
        {
            Id = Guid.NewGuid(),
            Code = input.Code,
            Name = input.Name,
            Description = input.Description,
            Type = !string.IsNullOrEmpty(input.Type)
                ? Enum.Parse<LocationType>(input.Type)
                : LocationType.Office,
            AddressLine1 = input.AddressLine1,
            AddressLine2 = input.AddressLine2,
            City = input.City,
            State = input.State,
            PostalCode = input.PostalCode,
            Country = input.Country,
            Phone = input.Phone,
            Timezone = input.Timezone,
            ParentLocationId = input.ParentLocationId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Locations.Add(location);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Location created: {Code} - {Name}", input.Code, input.Name);

        return location;
    }

    public async Task<BusinessLocation?> UpdateAsync(Guid id, UpdateLocationInput input)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            location.Name = input.Name;

        if (input.Description != null)
            location.Description = input.Description;

        if (!string.IsNullOrEmpty(input.Type))
            location.Type = Enum.Parse<LocationType>(input.Type);

        if (input.AddressLine1 != null)
            location.AddressLine1 = input.AddressLine1;

        if (input.AddressLine2 != null)
            location.AddressLine2 = input.AddressLine2;

        if (input.City != null)
            location.City = input.City;

        if (input.State != null)
            location.State = input.State;

        if (input.PostalCode != null)
            location.PostalCode = input.PostalCode;

        if (input.Country != null)
            location.Country = input.Country;

        if (input.Phone != null)
            location.Phone = input.Phone;

        if (input.Timezone != null)
            location.Timezone = input.Timezone;

        if (input.ParentLocationId.HasValue)
            location.ParentLocationId = input.ParentLocationId;

        if (input.IsActive.HasValue)
            location.IsActive = input.IsActive.Value;

        location.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return location;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null) return false;

        var hasEmployees = await _context.Employees
            .AnyAsync(e => e.LocationId == id);

        if (hasEmployees)
        {
            _logger.LogWarning("Cannot delete location {Code} - has employees", location.Code);
            return false;
        }

        location.IsActive = false;
        location.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
