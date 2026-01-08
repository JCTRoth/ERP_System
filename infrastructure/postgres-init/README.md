# PostgreSQL Initialization Scripts

This directory contains initialization scripts that run when the PostgreSQL container is first created.

## How It Works

The `init-multi-db.sh` script is automatically executed by the official PostgreSQL Docker image at container initialization (via `/docker-entrypoint-initdb.d`).

It creates:
- Multiple databases (one per microservice)
- Dedicated users for each database
- Proper ownership and privileges

## Security

Passwords are sourced from environment variables with sensible defaults for development:
- `ERP_USER_PASSWORD` (defaults to `postgres`)
- `ERP_SHOP_PASSWORD` (defaults to `postgres`)
- `ERP_ACCOUNTING_PASSWORD` (defaults to `postgres`)
- `ERP_MASTERDATA_PASSWORD` (defaults to `postgres`)
- `ERP_COMPANY_PASSWORD` (defaults to `postgres`)
- `ERP_NOTIFICATION_PASSWORD` (defaults to `postgres`)
- `ERP_TRANSLATION_PASSWORD` (defaults to `postgres`)
- `ERP_TEMPLATES_PASSWORD` (defaults to `postgres`)
- `ERP_EDIFACT_PASSWORD` (defaults to `postgres`)
- `ERP_SCRIPTING_PASSWORD` (defaults to `postgres`)

**For production**: Use Docker secrets or secure environment variables. Never commit passwords to version control.

## Databases Created

| Service | Database | User | Port (in dev) |
|---------|----------|------|---------------|
| User Service | `userdb` | `erp_user` | 5432 |
| Shop Service | `shopdb` | `erp_shop` | 5432 |
| Accounting Service | `accountingdb` | `erp_accounting` | 5432 |
| Masterdata Service | `masterdatadb` | `erp_masterdata` | 5432 |
| Company Service | `companydb` | `erp_company` | 5432 |
| Notification Service | `notificationdb` | `erp_notification` | 5432 |
| Translation Service | `translationdb` | `erp_translation` | 5432 |
| Templates Service | `templatesdb` | `erp_templates` | 5432 |
| Edifact Service | `edifactdb` | `erp_edifact` | 5432 |
| Scripting Service | `scriptingdb` | `erp_scripting` | 5432 |

All databases are hosted in a single PostgreSQL 16 container accessible at `postgres:5432` (from within Docker network).
