#!/usr/bin/env bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
-- Create all users first with CREATEDB privilege for EnsureCreated()
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_user') THEN
        CREATE USER erp_user WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_company') THEN
        CREATE USER erp_company WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_translation') THEN
        CREATE USER erp_translation WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_shop') THEN
        CREATE USER erp_shop WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_orders') THEN
        CREATE USER erp_orders WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_accounting') THEN
        CREATE USER erp_accounting WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_masterdata') THEN
        CREATE USER erp_masterdata WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_notification') THEN
        CREATE USER erp_notification WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_scripting') THEN
        CREATE USER erp_scripting WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_edifact') THEN
        CREATE USER erp_edifact WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_templates') THEN
        CREATE USER erp_templates WITH ENCRYPTED PASSWORD 'postgres' CREATEDB;
    END IF;
END $$;
EOSQL

# Create databases - must be outside of DO blocks
# Database names match what the services expect
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
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
