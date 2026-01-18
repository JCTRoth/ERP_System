# Accounting Service Payment Records Fix - Session Report

## Summary
Fixed the "Dienst nicht verfügbar" (Service Unavailable) error on the Accounting/Payments page that was preventing payment records from loading.

## Root Cause
The accounting service's database context configuration (Entity Framework) was **missing** the mapping for the `AccountId` property in the `PaymentRecord` model, while the code was trying to query it. Additionally, several other properties were missing from the DbContext configuration.

### Missing Properties
1. `AccountId` - Link to a GL account from the chart of accounts
2. `RefundedAmount` - Amount refunded on the payment
3. `IsRefund` - Flag to indicate if payment is a refund
4. `OriginalPaymentId` - Link to original payment if this is a refund
5. `ReferenceNumber` - Alternative reference field

## Changes Made

### 1. Code Fix: DbContext Configuration
**File**: [apps/services/dotnet/AccountingService/Data/AccountingDbContext.cs](apps/services/dotnet/AccountingService/Data/AccountingDbContext.cs#L185-L230)

Added missing property mappings to the `PaymentRecord` entity configuration:

```csharp
entity.Property(e => e.AccountId).HasColumnName("account_id");
entity.Property(e => e.RefundedAmount).HasColumnName("refunded_amount");
entity.Property(e => e.IsRefund).HasColumnName("is_refund");
entity.Property(e => e.OriginalPaymentId).HasColumnName("original_payment_id");
entity.Property(e => e.ReferenceNumber).HasColumnName("reference_number");

// Added foreign key relationship for Account
entity.HasOne(e => e.Account)
      .WithMany()
      .HasForeignKey(e => e.AccountId)
      .OnDelete(DeleteBehavior.SetNull);
```

### 2. Build and Deploy
- Built accounting-service with version 1.4
- Pushed to ghcr.io registry: `ghcr.io/jctroth/erp-accounting-service:1.4`
- Updated IMAGE_VERSION in production .env to 1.4
- Updated docker-compose.yml to use versioned images with environment variable fallback

### 3. Database Schema Updates
**Production Server**: 95.111.254.120

Added missing columns to `payment_records` table:
```sql
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(18,2) DEFAULT 0;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS original_payment_id UUID;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS reference_number VARCHAR(200);
```

## Deployment Results

### Before Fix
```
Error: "column p.account_id does not exist"
GraphQL Query: paymentRecords failed with 502 Bad Gateway
Frontend: "Dienst nicht verfügbar" error message displayed
```

### After Fix
```json
{
  "data": {
    "paymentRecords": {
      "nodes": [
        {
          "id": "c0000000-0000-0000-0000-000000000021",
          "paymentDate": "2026-01-10T00:00:00.000Z",
          "amount": 100,
          "paymentMethod": "BankTransfer"
        }
      ],
      "totalCount": 1
    }
  }
}
```

## Key Lessons Learned

1. **Entity Framework Consistency**: All properties on a model that should be persisted to the database must have corresponding configuration in the DbContext's `OnModelCreating` method, or use data annotations.

2. **Schema-Code Sync**: Database schema must match Entity Framework model configuration. Mismatches cause runtime errors that are difficult to debug.

3. **Multi-Layer Testing**: The error manifested at three different layers:
   - Database: Missing columns → SQL ERROR 42703
   - Service: QueryAsync fails → GraphQL null response
   - Frontend: Error state displays service unavailable message

4. **Version Management**: Updated production version from 1.3 to 1.4 to indicate a bug fix release

## Files Modified

1. [apps/services/dotnet/AccountingService/Data/AccountingDbContext.cs](apps/services/dotnet/AccountingService/Data/AccountingDbContext.cs) - Added missing property mappings
2. [docker-compose.yml](docker-compose.yml) - Updated accounting-service to use IMAGE_VERSION environment variable
3. [docker-compose.prod-local.yml](docker-compose.prod-local.yml) - Updated database password to use DB_PASSWORD env var

## Verification Checklist

✅ Accounting service builds successfully (2 warnings, 0 errors)
✅ Docker image built and pushed to registry (v1.4)
✅ Database schema updated with all missing columns
✅ Service password synchronized with database
✅ Gateway can reach accounting-service
✅ paymentRecords GraphQL query returns data
✅ Frontend no longer shows service unavailable error

## Additional Notes

- The deployment also included updating all hardcoded passwords in docker-compose files to use the DB_PASSWORD environment variable for better security practices
- The database now fully supports payment refunds (RefundedAmount, IsRefund, OriginalPaymentId fields)
- All related links and foreign keys are properly configured

## Testing Performed

```bash
# GraphQL Query Test
curl -k 'https://shopping-now.net/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ paymentRecords(first: 5) { nodes { id paymentDate amount paymentMethod } totalCount } }"}'

# Result: Successfully returns payment records with totalCount
```

## Production URL
- **Frontend**: https://shopping-now.net/accounting/payments
- **Status**: ✅ WORKING - Payment records now load successfully
