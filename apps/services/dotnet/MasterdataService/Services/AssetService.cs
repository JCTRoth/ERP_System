using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.DTOs;
using MasterdataService.Models;

namespace MasterdataService.Services;

public interface IAssetService
{
    Task<Asset?> GetByIdAsync(Guid id);
    Task<Asset?> GetByNumberAsync(string assetNumber);
    Task<IEnumerable<Asset>> GetAllAsync(int skip = 0, int take = 50);
    Task<IEnumerable<Asset>> GetByCategoryAsync(Guid categoryId);
    Task<IEnumerable<Asset>> GetByStatusAsync(AssetStatus status);
    Task<IEnumerable<Asset>> GetByAssigneeAsync(Guid employeeId);
    Task<IEnumerable<Asset>> GetByLocationAsync(Guid locationId);
    Task<IEnumerable<Asset>> SearchAsync(string query);
    Task<Asset> CreateAsync(CreateAssetInput input);
    Task<Asset?> UpdateAsync(Guid id, UpdateAssetInput input);
    Task<Asset?> AssignToAsync(Guid id, Guid employeeId);
    Task<Asset?> TransferAsync(Guid id, Guid locationId, Guid? departmentId);
    Task<Asset?> DisposeAsync(Guid id, DisposeAssetInput input);
    Task<decimal> CalculateDepreciationAsync(Guid id);
    Task<bool> DeleteAsync(Guid id);
}

public class AssetService : IAssetService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<AssetService> _logger;

    public AssetService(MasterdataDbContext context, ILogger<AssetService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Asset?> GetByIdAsync(Guid id)
    {
        return await _context.Assets
            .Include(a => a.Category)
            .Include(a => a.AssignedTo)
            .Include(a => a.Department)
            .Include(a => a.Location)
            .Include(a => a.CostCenter)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<Asset?> GetByNumberAsync(string assetNumber)
    {
        return await _context.Assets
            .Include(a => a.Category)
            .Include(a => a.AssignedTo)
            .FirstOrDefaultAsync(a => a.AssetNumber == assetNumber);
    }

    public async Task<IEnumerable<Asset>> GetAllAsync(int skip = 0, int take = 50)
    {
        return await _context.Assets
            .Include(a => a.Category)
            .Include(a => a.Location)
            .Where(a => a.Status != AssetStatus.Disposed)
            .OrderBy(a => a.AssetNumber)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Asset>> GetByCategoryAsync(Guid categoryId)
    {
        return await _context.Assets
            .Where(a => a.CategoryId == categoryId && a.Status != AssetStatus.Disposed)
            .OrderBy(a => a.AssetNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<Asset>> GetByStatusAsync(AssetStatus status)
    {
        return await _context.Assets
            .Where(a => a.Status == status)
            .OrderBy(a => a.AssetNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<Asset>> GetByAssigneeAsync(Guid employeeId)
    {
        return await _context.Assets
            .Where(a => a.AssignedToId == employeeId && a.Status == AssetStatus.Active)
            .OrderBy(a => a.AssetNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<Asset>> GetByLocationAsync(Guid locationId)
    {
        return await _context.Assets
            .Where(a => a.LocationId == locationId && a.Status != AssetStatus.Disposed)
            .OrderBy(a => a.AssetNumber)
            .ToListAsync();
    }

    public async Task<IEnumerable<Asset>> SearchAsync(string query)
    {
        return await _context.Assets
            .Where(a => a.Name.Contains(query) ||
                       a.AssetNumber.Contains(query) ||
                       (a.SerialNumber != null && a.SerialNumber.Contains(query)) ||
                       (a.Barcode != null && a.Barcode.Contains(query)))
            .OrderBy(a => a.AssetNumber)
            .Take(50)
            .ToListAsync();
    }

    public async Task<Asset> CreateAsync(CreateAssetInput input)
    {
        var assetNumber = await GenerateAssetNumberAsync();

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            AssetNumber = assetNumber,
            Name = input.Name,
            Description = input.Description,
            Type = !string.IsNullOrEmpty(input.Type)
                ? Enum.Parse<AssetType>(input.Type)
                : AssetType.Equipment,
            Status = AssetStatus.Active,
            CategoryId = input.CategoryId,
            PurchasePrice = input.PurchasePrice,
            PurchaseDate = input.PurchaseDate,
            CurrentValue = input.PurchasePrice,
            AccumulatedDepreciation = 0,
            SalvageValue = input.SalvageValue,
            UsefulLifeMonths = input.UsefulLifeMonths,
            DepreciationMethod = !string.IsNullOrEmpty(input.DepreciationMethod)
                ? Enum.Parse<DepreciationMethod>(input.DepreciationMethod)
                : DepreciationMethod.StraightLine,
            Currency = input.Currency ?? "USD",
            SerialNumber = input.SerialNumber,
            Barcode = input.Barcode,
            Manufacturer = input.Manufacturer,
            Model = input.Model,
            AssignedToId = input.AssignedToId,
            DepartmentId = input.DepartmentId,
            LocationId = input.LocationId,
            CostCenterId = input.CostCenterId,
            WarrantyExpiry = input.WarrantyExpiry,
            Notes = input.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Assets.Add(asset);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset created: {AssetNumber} - {Name}",
            assetNumber, asset.Name);

        return asset;
    }

    public async Task<Asset?> UpdateAsync(Guid id, UpdateAssetInput input)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            asset.Name = input.Name;

        if (input.Description != null)
            asset.Description = input.Description;

        if (!string.IsNullOrEmpty(input.Type))
            asset.Type = Enum.Parse<AssetType>(input.Type);

        if (!string.IsNullOrEmpty(input.Status))
            asset.Status = Enum.Parse<AssetStatus>(input.Status);

        if (input.CategoryId.HasValue)
            asset.CategoryId = input.CategoryId;

        if (input.CurrentValue.HasValue)
            asset.CurrentValue = input.CurrentValue.Value;

        if (input.SalvageValue.HasValue)
            asset.SalvageValue = input.SalvageValue;

        if (input.UsefulLifeMonths.HasValue)
            asset.UsefulLifeMonths = input.UsefulLifeMonths.Value;

        if (!string.IsNullOrEmpty(input.DepreciationMethod))
            asset.DepreciationMethod = Enum.Parse<DepreciationMethod>(input.DepreciationMethod);

        if (input.SerialNumber != null)
            asset.SerialNumber = input.SerialNumber;

        if (input.Barcode != null)
            asset.Barcode = input.Barcode;

        if (input.Manufacturer != null)
            asset.Manufacturer = input.Manufacturer;

        if (input.Model != null)
            asset.Model = input.Model;

        if (input.AssignedToId.HasValue)
            asset.AssignedToId = input.AssignedToId;

        if (input.DepartmentId.HasValue)
            asset.DepartmentId = input.DepartmentId;

        if (input.LocationId.HasValue)
            asset.LocationId = input.LocationId;

        if (input.CostCenterId.HasValue)
            asset.CostCenterId = input.CostCenterId;

        if (input.WarrantyExpiry.HasValue)
            asset.WarrantyExpiry = input.WarrantyExpiry;

        if (input.LastMaintenanceDate.HasValue)
            asset.LastMaintenanceDate = input.LastMaintenanceDate;

        if (input.NextMaintenanceDate.HasValue)
            asset.NextMaintenanceDate = input.NextMaintenanceDate;

        if (input.Notes != null)
            asset.Notes = input.Notes;

        asset.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset updated: {AssetNumber}", asset.AssetNumber);

        return asset;
    }

    public async Task<Asset?> AssignToAsync(Guid id, Guid employeeId)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return null;

        asset.AssignedToId = employeeId;
        asset.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset {AssetNumber} assigned to employee {EmployeeId}",
            asset.AssetNumber, employeeId);

        return asset;
    }

    public async Task<Asset?> TransferAsync(Guid id, Guid locationId, Guid? departmentId)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return null;

        asset.Status = AssetStatus.Transferred;
        asset.LocationId = locationId;
        if (departmentId.HasValue)
            asset.DepartmentId = departmentId;
        asset.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset {AssetNumber} transferred to location {LocationId}",
            asset.AssetNumber, locationId);

        // Reset status to Active after transfer
        asset.Status = AssetStatus.Active;
        await _context.SaveChangesAsync();

        return asset;
    }

    public async Task<Asset?> DisposeAsync(Guid id, DisposeAssetInput input)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return null;

        asset.Status = AssetStatus.Disposed;
        asset.DisposalDate = DateTime.UtcNow;
        asset.DisposalValue = input.DisposalValue;
        asset.DisposalReason = input.DisposalReason;
        asset.CurrentValue = 0;
        asset.AssignedToId = null;
        asset.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset {AssetNumber} disposed: {Reason}",
            asset.AssetNumber, input.DisposalReason);

        return asset;
    }

    public async Task<decimal> CalculateDepreciationAsync(Guid id)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return 0;

        var monthsInService = ((DateTime.UtcNow.Year - asset.PurchaseDate.Year) * 12) +
            (DateTime.UtcNow.Month - asset.PurchaseDate.Month);

        if (monthsInService <= 0) return 0;

        var depreciableAmount = asset.PurchasePrice - (asset.SalvageValue ?? 0);
        decimal depreciation = 0;

        switch (asset.DepreciationMethod)
        {
            case DepreciationMethod.StraightLine:
                var monthlyDepreciation = depreciableAmount / asset.UsefulLifeMonths;
                depreciation = Math.Min(monthlyDepreciation * monthsInService, depreciableAmount);
                break;

            case DepreciationMethod.DecliningBalance:
                var rate = 1.0m / asset.UsefulLifeMonths * 12; // Annual rate
                var remainingValue = asset.PurchasePrice;
                for (int i = 0; i < monthsInService / 12; i++)
                {
                    var yearlyDepreciation = remainingValue * rate;
                    depreciation += yearlyDepreciation;
                    remainingValue -= yearlyDepreciation;
                }
                break;

            case DepreciationMethod.DoubleDecliningBalance:
                var ddbRate = (2.0m / asset.UsefulLifeMonths) * 12;
                var bookValue = asset.PurchasePrice;
                for (int i = 0; i < monthsInService / 12; i++)
                {
                    var yearlyDep = bookValue * ddbRate;
                    depreciation += yearlyDep;
                    bookValue -= yearlyDep;
                    if (bookValue < (asset.SalvageValue ?? 0))
                    {
                        break;
                    }
                }
                break;
        }

        // Update asset
        asset.AccumulatedDepreciation = depreciation;
        asset.CurrentValue = asset.PurchasePrice - depreciation;
        asset.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return depreciation;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var asset = await _context.Assets.FindAsync(id);
        if (asset == null) return false;

        if (asset.Status == AssetStatus.Active)
        {
            _logger.LogWarning("Cannot delete active asset {AssetNumber}", asset.AssetNumber);
            return false;
        }

        _context.Assets.Remove(asset);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset deleted: {AssetNumber}", asset.AssetNumber);

        return true;
    }

    private async Task<string> GenerateAssetNumberAsync()
    {
        var lastAsset = await _context.Assets
            .OrderByDescending(a => a.AssetNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastAsset != null)
        {
            var lastNum = lastAsset.AssetNumber.Replace("AST-", "");
            if (int.TryParse(lastNum, out var num))
            {
                sequence = num + 1;
            }
        }

        return $"AST-{sequence:D6}";
    }
}

public interface IAssetCategoryService
{
    Task<AssetCategory?> GetByIdAsync(Guid id);
    Task<IEnumerable<AssetCategory>> GetAllAsync();
    Task<IEnumerable<AssetCategory>> GetHierarchyAsync();
    Task<AssetCategory> CreateAsync(CreateAssetCategoryInput input);
    Task<bool> DeleteAsync(Guid id);
}

public class AssetCategoryService : IAssetCategoryService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<AssetCategoryService> _logger;

    public AssetCategoryService(MasterdataDbContext context, ILogger<AssetCategoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AssetCategory?> GetByIdAsync(Guid id)
    {
        return await _context.AssetCategories
            .Include(c => c.SubCategories)
            .Include(c => c.Assets)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<IEnumerable<AssetCategory>> GetAllAsync()
    {
        return await _context.AssetCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<IEnumerable<AssetCategory>> GetHierarchyAsync()
    {
        return await _context.AssetCategories
            .Where(c => c.ParentCategoryId == null && c.IsActive)
            .Include(c => c.SubCategories)
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<AssetCategory> CreateAsync(CreateAssetCategoryInput input)
    {
        var category = new AssetCategory
        {
            Id = Guid.NewGuid(),
            Code = input.Code,
            Name = input.Name,
            Description = input.Description,
            ParentCategoryId = input.ParentCategoryId,
            DefaultUsefulLifeMonths = input.DefaultUsefulLifeMonths ?? 60,
            DefaultDepreciationMethod = !string.IsNullOrEmpty(input.DefaultDepreciationMethod)
                ? Enum.Parse<DepreciationMethod>(input.DefaultDepreciationMethod)
                : DepreciationMethod.StraightLine,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.AssetCategories.Add(category);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Asset category created: {Code} - {Name}", input.Code, input.Name);

        return category;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var category = await _context.AssetCategories.FindAsync(id);
        if (category == null) return false;

        var hasAssets = await _context.Assets.AnyAsync(a => a.CategoryId == id);
        if (hasAssets)
        {
            _logger.LogWarning("Cannot delete category {Code} - has assets", category.Code);
            return false;
        }

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
