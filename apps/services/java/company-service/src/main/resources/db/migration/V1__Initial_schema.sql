-- V1__Initial_schema.sql
-- Company Service Database Schema

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    logo_url TEXT,
    settings_json JSONB DEFAULT '{}',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_is_demo ON companies(is_demo);

-- User-Company Assignments table
CREATE TABLE user_company_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER')),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

CREATE INDEX idx_assignments_user_id ON user_company_assignments(user_id);
CREATE INDEX idx_assignments_company_id ON user_company_assignments(company_id);
CREATE INDEX idx_assignments_role ON user_company_assignments(role);

-- Dynamic Field Definitions table
CREATE TABLE dynamic_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('CUSTOMER', 'PRODUCT', 'ORDER', 'INVOICE', 'SUPPLIER', 'CUSTOM')),
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'JSON')),
    validation_rules JSONB,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, entity_type, field_name)
);

CREATE INDEX idx_field_defs_company_id ON dynamic_field_definitions(company_id);
CREATE INDEX idx_field_defs_entity_type ON dynamic_field_definitions(entity_type);

-- Dynamic Field Values table
CREATE TABLE dynamic_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES dynamic_field_definitions(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    value_json JSONB,
    UNIQUE(definition_id, entity_id)
);

CREATE INDEX idx_field_values_definition_id ON dynamic_field_values(definition_id);
CREATE INDEX idx_field_values_entity_id ON dynamic_field_values(entity_id);

-- GIN index for JSON search
CREATE INDEX idx_field_values_value_json ON dynamic_field_values USING GIN(value_json);
