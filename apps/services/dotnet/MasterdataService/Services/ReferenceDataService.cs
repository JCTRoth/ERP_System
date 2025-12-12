using Microsoft.EntityFrameworkCore;
using MasterdataService.Data;
using MasterdataService.DTOs;
using MasterdataService.Models;

namespace MasterdataService.Services;

public interface IReferenceDataService
{
    // Currency
    Task<IEnumerable<Currency>> GetCurrenciesAsync();
    Task<Currency?> GetCurrencyByCodeAsync(string code);
    Task<Currency> CreateCurrencyAsync(CreateCurrencyInput input);
    Task<Currency?> UpdateCurrencyAsync(Guid id, UpdateCurrencyInput input);

    // Payment Terms
    Task<IEnumerable<PaymentTerm>> GetPaymentTermsAsync();
    Task<PaymentTerm?> GetPaymentTermByCodeAsync(string code);
    Task<PaymentTerm> CreatePaymentTermAsync(CreatePaymentTermInput input);

    // Units of Measure
    Task<IEnumerable<UnitOfMeasure>> GetUnitsOfMeasureAsync();
    Task<UnitOfMeasure?> GetUnitByCodeAsync(string code);
    Task<UnitOfMeasure> CreateUnitOfMeasureAsync(CreateUnitOfMeasureInput input);
    Task<decimal> ConvertUnitsAsync(decimal amount, Guid fromUnitId, Guid toUnitId);

    // Tax Codes
    Task<IEnumerable<TaxCode>> GetTaxCodesAsync();
    Task<TaxCode?> GetTaxCodeByCodeAsync(string code);
    Task<TaxCode> CreateTaxCodeAsync(CreateTaxCodeInput input);
    Task<TaxCode?> UpdateTaxCodeAsync(Guid id, UpdateTaxCodeInput input);
}

public class ReferenceDataService : IReferenceDataService
{
    private readonly MasterdataDbContext _context;
    private readonly ILogger<ReferenceDataService> _logger;

    public ReferenceDataService(MasterdataDbContext context, ILogger<ReferenceDataService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Currency methods
    public async Task<IEnumerable<Currency>> GetCurrenciesAsync()
    {
        return await _context.Currencies
            .Where(c => c.IsActive)
            .OrderBy(c => c.Code)
            .ToListAsync();
    }

    public async Task<Currency?> GetCurrencyByCodeAsync(string code)
    {
        return await _context.Currencies
            .FirstOrDefaultAsync(c => c.Code == code);
    }

    public async Task<Currency> CreateCurrencyAsync(CreateCurrencyInput input)
    {
        var currency = new Currency
        {
            Id = Guid.NewGuid(),
            Code = input.Code.ToUpper(),
            Name = input.Name,
            Symbol = input.Symbol,
            DecimalPlaces = input.DecimalPlaces,
            ExchangeRate = input.ExchangeRate,
            IsBaseCurrency = input.IsBaseCurrency,
            IsActive = true,
            ExchangeRateDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        if (input.IsBaseCurrency)
        {
            // Clear other base currencies
            await _context.Currencies
                .Where(c => c.IsBaseCurrency)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsBaseCurrency, false));
        }

        _context.Currencies.Add(currency);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Currency created: {Code}", input.Code);

        return currency;
    }

    public async Task<Currency?> UpdateCurrencyAsync(Guid id, UpdateCurrencyInput input)
    {
        var currency = await _context.Currencies.FindAsync(id);
        if (currency == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            currency.Name = input.Name;

        if (input.Symbol != null)
            currency.Symbol = input.Symbol;

        if (input.ExchangeRate.HasValue)
        {
            currency.ExchangeRate = input.ExchangeRate.Value;
            currency.ExchangeRateDate = DateTime.UtcNow;
        }

        if (input.IsActive.HasValue)
            currency.IsActive = input.IsActive.Value;

        currency.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return currency;
    }

    // Payment Terms methods
    public async Task<IEnumerable<PaymentTerm>> GetPaymentTermsAsync()
    {
        return await _context.PaymentTerms
            .Where(p => p.IsActive)
            .OrderBy(p => p.DueDays)
            .ToListAsync();
    }

    public async Task<PaymentTerm?> GetPaymentTermByCodeAsync(string code)
    {
        return await _context.PaymentTerms
            .FirstOrDefaultAsync(p => p.Code == code);
    }

    public async Task<PaymentTerm> CreatePaymentTermAsync(CreatePaymentTermInput input)
    {
        var paymentTerm = new PaymentTerm
        {
            Id = Guid.NewGuid(),
            Code = input.Code,
            Name = input.Name,
            Description = input.Description,
            DueDays = input.DueDays,
            DiscountPercent = input.DiscountPercent,
            DiscountDays = input.DiscountDays,
            Type = !string.IsNullOrEmpty(input.Type)
                ? Enum.Parse<PaymentTermType>(input.Type)
                : PaymentTermType.Net,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentTerms.Add(paymentTerm);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment term created: {Code}", input.Code);

        return paymentTerm;
    }

    // Units of Measure methods
    public async Task<IEnumerable<UnitOfMeasure>> GetUnitsOfMeasureAsync()
    {
        return await _context.UnitsOfMeasure
            .Where(u => u.IsActive)
            .OrderBy(u => u.Type)
            .ThenBy(u => u.Code)
            .ToListAsync();
    }

    public async Task<UnitOfMeasure?> GetUnitByCodeAsync(string code)
    {
        return await _context.UnitsOfMeasure
            .FirstOrDefaultAsync(u => u.Code == code);
    }

    public async Task<UnitOfMeasure> CreateUnitOfMeasureAsync(CreateUnitOfMeasureInput input)
    {
        var unit = new UnitOfMeasure
        {
            Id = Guid.NewGuid(),
            Code = input.Code.ToUpper(),
            Name = input.Name,
            Symbol = input.Symbol,
            Type = Enum.Parse<UomType>(input.Type),
            BaseUnitId = input.BaseUnitId,
            ConversionFactor = input.ConversionFactor,
            IsBaseUnit = input.IsBaseUnit,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.UnitsOfMeasure.Add(unit);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Unit of measure created: {Code}", input.Code);

        return unit;
    }

    public async Task<decimal> ConvertUnitsAsync(decimal amount, Guid fromUnitId, Guid toUnitId)
    {
        if (fromUnitId == toUnitId) return amount;

        var fromUnit = await _context.UnitsOfMeasure.FindAsync(fromUnitId);
        var toUnit = await _context.UnitsOfMeasure.FindAsync(toUnitId);

        if (fromUnit == null || toUnit == null)
        {
            throw new InvalidOperationException("Unit not found");
        }

        if (fromUnit.Type != toUnit.Type)
        {
            throw new InvalidOperationException(
                $"Cannot convert between {fromUnit.Type} and {toUnit.Type}");
        }

        // Convert to base unit, then to target unit
        var baseAmount = amount * fromUnit.ConversionFactor;
        return baseAmount / toUnit.ConversionFactor;
    }

    // Tax Codes methods
    public async Task<IEnumerable<TaxCode>> GetTaxCodesAsync()
    {
        var today = DateTime.UtcNow;
        return await _context.TaxCodes
            .Where(t => t.IsActive &&
                       t.EffectiveFrom <= today &&
                       (t.EffectiveTo == null || t.EffectiveTo >= today))
            .OrderBy(t => t.Code)
            .ToListAsync();
    }

    public async Task<TaxCode?> GetTaxCodeByCodeAsync(string code)
    {
        var today = DateTime.UtcNow;
        return await _context.TaxCodes
            .FirstOrDefaultAsync(t => t.Code == code &&
                                     t.IsActive &&
                                     t.EffectiveFrom <= today &&
                                     (t.EffectiveTo == null || t.EffectiveTo >= today));
    }

    public async Task<TaxCode> CreateTaxCodeAsync(CreateTaxCodeInput input)
    {
        var taxCode = new TaxCode
        {
            Id = Guid.NewGuid(),
            Code = input.Code.ToUpper(),
            Name = input.Name,
            Description = input.Description,
            Rate = input.Rate,
            Type = Enum.Parse<TaxType>(input.Type),
            TaxAuthority = input.TaxAuthority,
            IsActive = true,
            IsDefault = input.IsDefault,
            EffectiveFrom = input.EffectiveFrom,
            EffectiveTo = input.EffectiveTo,
            CreatedAt = DateTime.UtcNow
        };

        if (input.IsDefault)
        {
            await _context.TaxCodes
                .Where(t => t.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsDefault, false));
        }

        _context.TaxCodes.Add(taxCode);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Tax code created: {Code}", input.Code);

        return taxCode;
    }

    public async Task<TaxCode?> UpdateTaxCodeAsync(Guid id, UpdateTaxCodeInput input)
    {
        var taxCode = await _context.TaxCodes.FindAsync(id);
        if (taxCode == null) return null;

        if (!string.IsNullOrEmpty(input.Name))
            taxCode.Name = input.Name;

        if (input.Description != null)
            taxCode.Description = input.Description;

        if (input.Rate.HasValue)
            taxCode.Rate = input.Rate.Value;

        if (input.TaxAuthority != null)
            taxCode.TaxAuthority = input.TaxAuthority;

        if (input.IsActive.HasValue)
            taxCode.IsActive = input.IsActive.Value;

        if (input.IsDefault.HasValue && input.IsDefault.Value)
        {
            await _context.TaxCodes
                .Where(t => t.IsDefault && t.Id != id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsDefault, false));
            taxCode.IsDefault = true;
        }

        if (input.EffectiveTo.HasValue)
            taxCode.EffectiveTo = input.EffectiveTo;

        taxCode.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return taxCode;
    }
}
