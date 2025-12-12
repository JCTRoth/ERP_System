-- V1__Initial_schema.sql
-- EDIFACT Service Database Schema

-- EDIFACT messages table
CREATE TABLE edifact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    message_version VARCHAR(10),
    direction VARCHAR(10) NOT NULL,
    interchange_ref VARCHAR(50),
    message_ref VARCHAR(50),
    sender_id VARCHAR(100),
    recipient_id VARCHAR(100),
    file_path VARCHAR(500),
    original_filename VARCHAR(255),
    parsed_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EDIFACT mappings table (Smooks configurations)
CREATE TABLE edifact_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    message_type VARCHAR(20) NOT NULL,
    message_version VARCHAR(10),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    smooks_config TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, message_type, message_version)
);

-- Indexes
CREATE INDEX idx_messages_company ON edifact_messages(company_id);
CREATE INDEX idx_messages_type ON edifact_messages(message_type);
CREATE INDEX idx_messages_direction ON edifact_messages(direction);
CREATE INDEX idx_messages_status ON edifact_messages(status);
CREATE INDEX idx_messages_created ON edifact_messages(created_at);
CREATE INDEX idx_mappings_company ON edifact_mappings(company_id);
CREATE INDEX idx_mappings_type ON edifact_mappings(message_type);
