#!/usr/bin/env bash
set -e

# This script runs at Postgres container initialization via docker-entrypoint-initdb.d
# Creates multiple databases and users for the ERP microservices
# Uses environment variables for passwords (loaded from Docker secrets or env files)

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- User Service Database
    CREATE USER erp_user WITH ENCRYPTED PASSWORD '${ERP_USER_PASSWORD:-postgres}';
    CREATE DATABASE userdb OWNER erp_user;
    GRANT ALL PRIVILEGES ON DATABASE userdb TO erp_user;

    -- Shop Service Database
    CREATE USER erp_shop WITH ENCRYPTED PASSWORD '${ERP_SHOP_PASSWORD:-postgres}';
    CREATE DATABASE shopdb OWNER erp_shop;
    GRANT ALL PRIVILEGES ON DATABASE shopdb TO erp_shop;

    -- Accounting Service Database
    CREATE USER erp_accounting WITH ENCRYPTED PASSWORD '${ERP_ACCOUNTING_PASSWORD:-postgres}';
    CREATE DATABASE accountingdb OWNER erp_accounting;
    GRANT ALL PRIVILEGES ON DATABASE accountingdb TO erp_accounting;

    -- Masterdata Service Database
    CREATE USER erp_masterdata WITH ENCRYPTED PASSWORD '${ERP_MASTERDATA_PASSWORD:-postgres}';
    CREATE DATABASE masterdatadb OWNER erp_masterdata;
    GRANT ALL PRIVILEGES ON DATABASE masterdatadb TO erp_masterdata;

    -- Orders Service Database
    CREATE USER erp_orders WITH ENCRYPTED PASSWORD '${ERP_ORDERS_PASSWORD:-postgres}';
    CREATE DATABASE ordersdb OWNER erp_orders;
    GRANT ALL PRIVILEGES ON DATABASE ordersdb TO erp_orders;

    -- Company Service Database
    CREATE USER erp_company WITH ENCRYPTED PASSWORD '${ERP_COMPANY_PASSWORD:-postgres}';
    CREATE DATABASE companydb OWNER erp_company;
    GRANT ALL PRIVILEGES ON DATABASE companydb TO erp_company;

    -- Notification Service Database
    CREATE USER erp_notification WITH ENCRYPTED PASSWORD '${ERP_NOTIFICATION_PASSWORD:-postgres}';
    CREATE DATABASE notificationdb OWNER erp_notification;
    GRANT ALL PRIVILEGES ON DATABASE notificationdb TO erp_notification;

    -- Translation Service Database
    CREATE USER erp_translation WITH ENCRYPTED PASSWORD '${ERP_TRANSLATION_PASSWORD:-postgres}';
    CREATE DATABASE translationdb OWNER erp_translation;
    GRANT ALL PRIVILEGES ON DATABASE translationdb TO erp_translation;

    -- Templates Service Database
    CREATE USER erp_templates WITH ENCRYPTED PASSWORD '${ERP_TEMPLATES_PASSWORD:-postgres}';
    CREATE DATABASE templatesdb OWNER erp_templates;
    GRANT ALL PRIVILEGES ON DATABASE templatesdb TO erp_templates;

    -- Edifact Service Database (if needed)
    CREATE USER erp_edifact WITH ENCRYPTED PASSWORD '${ERP_EDIFACT_PASSWORD:-postgres}';
    CREATE DATABASE edifactdb OWNER erp_edifact;
    GRANT ALL PRIVILEGES ON DATABASE edifactdb TO erp_edifact;

    -- Scripting Service Database (if needed)
    CREATE USER erp_scripting WITH ENCRYPTED PASSWORD '${ERP_SCRIPTING_PASSWORD:-postgres}';
    CREATE DATABASE scriptingdb OWNER erp_scripting;
    GRANT ALL PRIVILEGES ON DATABASE scriptingdb TO erp_scripting;
EOSQL

echo "✅ All databases and users created successfully"
