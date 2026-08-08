# scripts/dev — Local Development

Scripts for starting and stopping the ERP System locally via Docker Compose.

## Scripts

| Script | Purpose |
|---|---|
| `start-local.sh` | Start the complete stack locally with health checks, ordered startup and seed verification |
| `seed-local.sh` | Verify every running service is seeded with demo data; restart services whose database is empty so their code-based seeding re-runs |
| `stop-local.sh` | Safely stop and remove all ERP System containers |

## Usage

Run from the **repository root**:

```bash
# Start all services (includes seeding verification)
./scripts/dev/start-local.sh

# Verify / fix seeding only (postgres must be running)
./scripts/dev/seed-local.sh
./scripts/dev/seed-local.sh --dry-run        # report only, never restart
./scripts/dev/seed-local.sh orders-service   # only one service

# Stop all services
./scripts/dev/stop-local.sh
```

## Startup order

1. Pre-flight checks (Docker, compose file availability)
2. Port availability checks
3. PostgreSQL (waits for healthy)
4. All GraphQL microservices (waits for healthy)
5. Apollo Gateway
6. Seed & verify demo data
7. Frontend

## Seeding

Every backend service seeds itself **by code** at startup (idempotent):

| Service | Seeder |
|---|---|
| UserService | `SeedDataService` (demo users) + `UserDbContext` (super admin) |
| ShopService | `SeedDataService` (MediVita products/customers/orders) |
| MasterdataService | `MasterdataInitializer` (currencies, tax codes, customers, …) |
| AccountingService | `AccountingDbContext` `HasData` (chart of accounts, invoices) |
| OrdersService | `SeedDataService` (demo orders) |
| CompanyService | `DataInitializerConfig` → `createDemoCompanyIfNotExists()` |
| NotificationService | `EmailTemplateSeeder` (welcome/password-reset/order templates) |
| TranslationService | Flyway SQL migrations (generated from frontend locale files) |

`start-local.sh` calls `seed-local.sh` after the backend is up. If a service's
database is empty, `seed-local.sh` restarts that service so its startup seeding
runs again.

The frontend is accessible at `http://localhost:5173` and the gateway at `http://localhost:4000`.
