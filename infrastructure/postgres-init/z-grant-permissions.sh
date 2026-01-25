#!/usr/bin/env bash
set -e

# Script to create databases and grant permissions to all ERP users on their respective databases
# This ensures that even if tables were created by different users, permissions are correct

# Default to the postgres superuser when POSTGRES_USER is not provided
POSTGRES_SUPERUSER="${POSTGRES_USER:-postgres}"

# Create databases if they don't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_SUPERUSER" --dbname "$POSTGRES_DB" <<'EOSQL'
SELECT 'CREATE DATABASE userdb OWNER erp_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'userdb')\gexec

SELECT 'CREATE DATABASE companydb OWNER erp_company'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'companydb')\gexec

SELECT 'CREATE DATABASE translationdb OWNER erp_translation'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'translationdb')\gexec

SELECT 'CREATE DATABASE shopdb OWNER erp_shop'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shopdb')\gexec

SELECT 'CREATE DATABASE ordersdb OWNER erp_orders'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ordersdb')\gexec

SELECT 'CREATE DATABASE accountingdb OWNER erp_accounting'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'accountingdb')\gexec

SELECT 'CREATE DATABASE masterdatadb OWNER erp_masterdata'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'masterdatadb')\gexec

SELECT 'CREATE DATABASE notificationdb OWNER erp_notification'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notificationdb')\gexec

SELECT 'CREATE DATABASE scriptingdb OWNER erp_scripting'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'scriptingdb')\gexec

SELECT 'CREATE DATABASE edifactdb OWNER erp_edifact'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'edifactdb')\gexec

SELECT 'CREATE DATABASE templatesdb OWNER erp_templates'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'templatesdb')\gexec
EOSQL

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

echo "Databases created and permissions granted successfully."