using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MasterdataService.Models;

public class Employee
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string EmployeeNumber { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? MiddleName { get; set; }
    
    [MaxLength(100)]
    [EmailAddress]
    public string? Email { get; set; }
    
    [MaxLength(100)]
    [EmailAddress]
    public string? PersonalEmail { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Mobile { get; set; }
    
    public DateTime? DateOfBirth { get; set; }
    
    public Gender? Gender { get; set; }
    
    [MaxLength(100)]
    public string? Nationality { get; set; }
    
    [MaxLength(50)]
    public string? TaxId { get; set; }
    
    [MaxLength(50)]
    public string? SocialSecurityNumber { get; set; }
    
    // Employment details
    public DateTime HireDate { get; set; }
    public DateTime? TerminationDate { get; set; }
    
    public EmploymentType EmploymentType { get; set; } = EmploymentType.FullTime;
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    
    [MaxLength(100)]
    public string? JobTitle { get; set; }
    
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    public Guid? ManagerId { get; set; }
    public Employee? Manager { get; set; }
    
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
    
    public Guid? LocationId { get; set; }
    public BusinessLocation? Location { get; set; }
    
    // Compensation
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Salary { get; set; }
    
    public SalaryType SalaryType { get; set; } = SalaryType.Monthly;
    
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    // Relationships
    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public ICollection<Employee> DirectReports { get; set; } = new List<Employee>();
    
    // User link
    public Guid? UserId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    public string FullName => $"{FirstName} {LastName}";
}

public enum Gender
{
    Male,
    Female,
    Other,
    PreferNotToSay
}

public enum EmploymentType
{
    FullTime,
    PartTime,
    Contract,
    Intern,
    Temporary,
    Consultant
}

public enum EmployeeStatus
{
    Active,
    OnLeave,
    Suspended,
    Terminated,
    Retired
}

public enum SalaryType
{
    Hourly,
    Daily,
    Weekly,
    BiWeekly,
    Monthly,
    Annual
}

public class Department
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public Guid? ParentDepartmentId { get; set; }
    public Department? ParentDepartment { get; set; }
    
    public Guid? ManagerId { get; set; }
    public Employee? Manager { get; set; }
    
    public Guid? CostCenterId { get; set; }
    public CostCenter? CostCenter { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<Department> SubDepartments { get; set; } = new List<Department>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CostCenter
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public CostCenterType Type { get; set; } = CostCenterType.Department;
    
    public Guid? ParentCostCenterId { get; set; }
    public CostCenter? ParentCostCenter { get; set; }
    
    public Guid? ResponsiblePersonId { get; set; }
    public Employee? ResponsiblePerson { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Budget { get; set; }
    
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<CostCenter> SubCostCenters { get; set; } = new List<CostCenter>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum CostCenterType
{
    Department,
    Project,
    Product,
    Region,
    Activity
}

public class BusinessLocation
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public LocationType Type { get; set; } = LocationType.Office;
    
    [MaxLength(200)]
    public string? AddressLine1 { get; set; }
    
    [MaxLength(200)]
    public string? AddressLine2 { get; set; }
    
    [MaxLength(100)]
    public string? City { get; set; }
    
    [MaxLength(100)]
    public string? State { get; set; }
    
    [MaxLength(20)]
    public string? PostalCode { get; set; }
    
    [MaxLength(100)]
    public string? Country { get; set; }
    
    [MaxLength(50)]
    public string? Phone { get; set; }
    
    [MaxLength(50)]
    public string? Timezone { get; set; }
    
    public Guid? ParentLocationId { get; set; }
    public BusinessLocation? ParentLocation { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<BusinessLocation> SubLocations { get; set; } = new List<BusinessLocation>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum LocationType
{
    Headquarters,
    Office,
    Warehouse,
    Factory,
    Store,
    Branch,
    Remote
}
