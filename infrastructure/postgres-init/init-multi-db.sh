#!/usr/bin/env bash
set -e

# This script runs at Postgres container initialization via docker-entrypoint-initdb.d
# Creates multiple databases and users for the ERP microservices
# Uses environment variables for passwords (loaded from Docker secrets or env files)

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
-- Helper: create user if not exists
CREATE OR REPLACE FUNCTION ensure_user(u TEXT, p TEXT) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = u) THEN
        EXECUTE format('CREATE USER %I WITH ENCRYPTED PASSWORD %L', u, p);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper: create database if not exists
CREATE OR REPLACE FUNCTION ensure_db(dbname TEXT, owner TEXT) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = dbname) THEN
        EXECUTE format('CREATE DATABASE %I OWNER %I', dbname, owner);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create users and databases (both legacy 'erp_*' names and service expected '*db' names)

-- User Service
SELECT ensure_user('erp_user', '${ERP_USER_PASSWORD:-postgres}');
SELECT ensure_db('erp_user', 'erp_user');
SELECT ensure_db('userdb', 'erp_user');

-- Shop Service
SELECT ensure_user('erp_shop', '${ERP_SHOP_PASSWORD:-postgres}');
SELECT ensure_db('erp_shop', 'erp_shop');
SELECT ensure_db('shopdb', 'erp_shop');

-- Accounting Service
SELECT ensure_user('erp_accounting', '${ERP_ACCOUNTING_PASSWORD:-postgres}');
SELECT ensure_db('erp_accounting', 'erp_accounting');
SELECT ensure_db('accountingdb', 'erp_accounting');

-- Masterdata Service
SELECT ensure_user('erp_masterdata', '${ERP_MASTERDATA_PASSWORD:-postgres}');
SELECT ensure_db('erp_masterdata', 'erp_masterdata');
SELECT ensure_db('masterdatadb', 'erp_masterdata');

-- Orders Service
SELECT ensure_user('erp_orders', '${ERP_ORDERS_PASSWORD:-postgres}');
SELECT ensure_db('erp_orders', 'erp_orders');
SELECT ensure_db('ordersdb', 'erp_orders');

-- Company Service
SELECT ensure_user('erp_company', '${ERP_COMPANY_PASSWORD:-postgres}');
SELECT ensure_db('erp_company', 'erp_company');
SELECT ensure_db('companydb', 'erp_company');

-- Notification Service
SELECT ensure_user('erp_notification', '${ERP_NOTIFICATION_PASSWORD:-postgres}');
SELECT ensure_db('erp_notification', 'erp_notification');
SELECT ensure_db('notificationdb', 'erp_notification');

-- Translation Service
SELECT ensure_user('erp_translation', '${ERP_TRANSLATION_PASSWORD:-postgres}');
SELECT ensure_db('erp_translation', 'erp_translation');
SELECT ensure_db('translationdb', 'erp_translation');

-- Templates Service
SELECT ensure_user('erp_templates', '${ERP_TEMPLATES_PASSWORD:-postgres}');
SELECT ensure_db('erp_templates', 'erp_templates');
SELECT ensure_db('templatesdb', 'erp_templates');

-- Edifact Service
SELECT ensure_user('erp_edifact', '${ERP_EDIFACT_PASSWORD:-postgres}');
SELECT ensure_db('erp_edifact', 'erp_edifact');
SELECT ensure_db('edifactdb', 'erp_edifact');

-- Scripting Service
SELECT ensure_user('erp_scripting', '${ERP_SCRIPTING_PASSWORD:-postgres}');
SELECT ensure_db('erp_scripting', 'erp_scripting');
SELECT ensure_db('scriptingdb', 'erp_scripting');

-- Cleanup helper functions
DROP FUNCTION IF EXISTS ensure_db(text, text);
DROP FUNCTION IF EXISTS ensure_user(text, text);
EOSQL

echo "✅ All databases and users created successfully"
