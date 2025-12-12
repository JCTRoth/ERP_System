-- V1__Initial_schema.sql
-- Scripting Service Database Schema

-- Scripts table
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    trigger_event VARCHAR(50),
    trigger_entity VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Script executions table (audit log)
CREATE TABLE script_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    executed_by UUID,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    error_message TEXT,
    execution_time_ms BIGINT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_scripts_company ON scripts(company_id);
CREATE INDEX idx_scripts_type ON scripts(type);
CREATE INDEX idx_scripts_trigger ON scripts(company_id, trigger_event, trigger_entity) WHERE is_active = TRUE;
CREATE INDEX idx_executions_script ON script_executions(script_id);
CREATE INDEX idx_executions_company ON script_executions(company_id);
CREATE INDEX idx_executions_status ON script_executions(status);
CREATE INDEX idx_executions_started ON script_executions(started_at);
