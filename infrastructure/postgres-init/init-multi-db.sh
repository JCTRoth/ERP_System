#!/usr/bin/env bash
set -e

# Use DB_PASSWORD environment variable, default to deployment password for backward compatibility
DB_PASS="${DB_PASSWORD:-Ra\$hWee5Pei1e\$}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
-- Create all users first with CREATEDB privilege for EnsureCreated()
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_user') THEN
        CREATE USER erp_user WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_company') THEN
        CREATE USER erp_company WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_translation') THEN
        CREATE USER erp_translation WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_shop') THEN
        CREATE USER erp_shop WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_orders') THEN
        CREATE USER erp_orders WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_accounting') THEN
        CREATE USER erp_accounting WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_masterdata') THEN
        CREATE USER erp_masterdata WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_notification') THEN
        CREATE USER erp_notification WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_scripting') THEN
        CREATE USER erp_scripting WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_edifact') THEN
        CREATE USER erp_edifact WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_templates') THEN
        CREATE USER erp_templates WITH ENCRYPTED PASSWORD '$DB_PASS' CREATEDB;
    END IF;
END \$\$;
EOSQL

# Create databases - must be outside of DO blocks
# Database names match what the services expect
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE DATABASE userdb OWNER erp_user;
CREATE DATABASE companydb OWNER erp_company;
CREATE DATABASE translationdb OWNER erp_translation;
CREATE DATABASE shopdb OWNER erp_shop;
CREATE DATABASE ordersdb OWNER erp_orders;
CREATE DATABASE accountingdb OWNER erp_accounting;
CREATE DATABASE masterdatadb OWNER erp_masterdata;
CREATE DATABASE notificationdb OWNER erp_notification;
CREATE DATABASE scriptingdb OWNER erp_scripting;
CREATE DATABASE edifactdb OWNER erp_edifact;
CREATE DATABASE templatesdb OWNER erp_templates;
EOSQL
