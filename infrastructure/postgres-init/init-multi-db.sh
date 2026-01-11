#!/usr/bin/env bash
set -e

# This script runs at Postgres container initialization via docker-entrypoint-initdb.d
# Creates multiple databases and users for the ERP microservices
# Uses environment variables for passwords (loaded from Docker secrets or env files)

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- User Service Database
    CREATE USER erp_user WITH ENCRYPTED PASSWORD '${ERP_USER_PASSWORD:-postgres}';
    CREATE DATABASE erp_user OWNER erp_user;
    GRANT ALL PRIVILEGES ON DATABASE erp_user TO erp_user;

    -- Shop Service Database
    CREATE USER erp_shop WITH ENCRYPTED PASSWORD '${ERP_SHOP_PASSWORD:-postgres}';
    CREATE DATABASE erp_shop OWNER erp_shop;
    GRANT ALL PRIVILEGES ON DATABASE erp_shop TO erp_shop;

    -- Accounting Service Database
    CREATE USER erp_accounting WITH ENCRYPTED PASSWORD '${ERP_ACCOUNTING_PASSWORD:-postgres}';
    CREATE DATABASE erp_accounting OWNER erp_accounting;
    GRANT ALL PRIVILEGES ON DATABASE erp_accounting TO erp_accounting;

    -- Masterdata Service Database
    CREATE USER erp_masterdata WITH ENCRYPTED PASSWORD '${ERP_MASTERDATA_PASSWORD:-postgres}';
    CREATE DATABASE erp_masterdata OWNER erp_masterdata;
    GRANT ALL PRIVILEGES ON DATABASE erp_masterdata TO erp_masterdata;

    -- Orders Service Database
    CREATE USER erp_orders WITH ENCRYPTED PASSWORD '${ERP_ORDERS_PASSWORD:-postgres}';
    CREATE DATABASE erp_orders OWNER erp_orders;
    GRANT ALL PRIVILEGES ON DATABASE erp_orders TO erp_orders;

    -- Company Service Database
    CREATE USER erp_company WITH ENCRYPTED PASSWORD '${ERP_COMPANY_PASSWORD:-postgres}';
    CREATE DATABASE erp_company OWNER erp_company;
    GRANT ALL PRIVILEGES ON DATABASE erp_company TO erp_company;

    -- Notification Service Database
    CREATE USER erp_notification WITH ENCRYPTED PASSWORD '${ERP_NOTIFICATION_PASSWORD:-postgres}';
    CREATE DATABASE erp_notification OWNER erp_notification;
    GRANT ALL PRIVILEGES ON DATABASE erp_notification TO erp_notification;

    -- Translation Service Database
    CREATE USER erp_translation WITH ENCRYPTED PASSWORD '${ERP_TRANSLATION_PASSWORD:-postgres}';
    CREATE DATABASE erp_translation OWNER erp_translation;
    GRANT ALL PRIVILEGES ON DATABASE erp_translation TO erp_translation;

    -- Templates Service Database
    CREATE USER erp_templates WITH ENCRYPTED PASSWORD '${ERP_TEMPLATES_PASSWORD:-postgres}';
    CREATE DATABASE erp_templates OWNER erp_templates;
    GRANT ALL PRIVILEGES ON DATABASE erp_templates TO erp_templates;

    -- Edifact Service Database (if needed)
    CREATE USER erp_edifact WITH ENCRYPTED PASSWORD '${ERP_EDIFACT_PASSWORD:-postgres}';
    CREATE DATABASE erp_edifact OWNER erp_edifact;
    GRANT ALL PRIVILEGES ON DATABASE erp_edifact TO erp_edifact;

    -- Scripting Service Database (if needed)
    CREATE USER erp_scripting WITH ENCRYPTED PASSWORD '${ERP_SCRIPTING_PASSWORD:-postgres}';
    CREATE DATABASE erp_scripting OWNER erp_scripting;
    GRANT ALL PRIVILEGES ON DATABASE erp_scripting TO erp_scripting;
EOSQL

echo "✅ All databases and users created successfully"
