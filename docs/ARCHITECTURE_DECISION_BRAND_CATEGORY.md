# Brand and Category Architecture Decision

## Current State
- Brand and Category are currently stored in ShopService database
- They are core to product management
- ShopService has direct ownership and control

## Proposed Architecture

### Option A: Keep in ShopService (Current)
**Pros:**
- Products and their brands/categories stay in same service
- Simpler queries (no cross-service references)
- Tight coupling makes sense for shop operations
- Migration effort: None

**Cons:**
- Inconsistent with other reference data (Currency, TaxCode) in MasterdataService
- Harder to share brands/categories with other services if needed

### Option B: Move to MasterdataService
**Pros:**
- Consistent with other reference data (Currency, TaxCode, PaymentTerms, etc.)
- Better separation of concerns
- Reference data centralized
- Easier to share with other services
- Better for microservices architecture

**Cons:**
- Requires significant refactoring
- Additional network calls for every product query
- Breaking change for existing code
- Migration effort: High

## Recommendation: Option B - Move to MasterdataService

**Rationale:**
- MasterdataService is already established for reference/master data
- Brand and Category are by definition reference/master data, not transactional data
- Better long-term scalability
- Aligns with microservices best practices

## Migration Plan (Future)

1. Create Brand and Category models in MasterdataService
2. Create EF Core migrations for MasterdataService
3. Copy existing Brand/Category data from ShopService
4. Update ShopService to reference Brand/CategoryId (no nested objects)
5. Update GraphQL queries in both services
6. Update all Seed data
7. Create data migration scripts
8. Update client code to fetch brands/categories from MasterdataService queries

## Implementation Notes
- This is a breaking change - coordinate with teams
- Consider gradual migration if needed
- API versioning might be needed
- Cache brands/categories frequently on frontend to minimize cross-service calls

## Current Workaround
For now, brands and categories remain in ShopService. They can be moved to MasterdataService in a future sprint as a dedicated migration task.
