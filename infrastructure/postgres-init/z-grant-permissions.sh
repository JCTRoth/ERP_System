#!/usr/bin/env bash
set -e

# Script to grant permissions to all ERP users on their respective databases
# This ensures that even if tables were created by different users, permissions are correct

# Default to the postgres superuser when POSTGRES_USER is not provided
POSTGRES_SUPERUSER="${POSTGRES_USER:-postgres}"

# Function to grant permissions in a specific database
grant_permissions() {
    local db=$1
    local user=$2
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_SUPERUSER" --dbname "$db" <<EOSQL
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $user;
EOSQL
}

# Grant permissions for each database
# Note: Database names must match what is defined in docker-compose.yml (some use underscores, some don't)
# grant_permissions userdb erp_user  <-- Role erp_user does not exist on server, and User Service uses postgres user
grant_permissions companydb erp_company
grant_permissions translationdb erp_translation
grant_permissions shopdb erp_shop
grant_permissions ordersdb erp_orders
grant_permissions accountingdb erp_accounting
grant_permissions masterdatadb erp_masterdata
grant_permissions notificationdb erp_notification
grant_permissions scriptingdb erp_scripting
grant_permissions edifactdb erp_edifact
grant_permissions templatesdb erp_templates

echo "Database permissions granted successfully."