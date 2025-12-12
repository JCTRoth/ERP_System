-- V1__Initial_schema.sql
-- Translation Service Database Schema

-- Translation Keys table
CREATE TABLE translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL,
    namespace VARCHAR(50) DEFAULT 'common',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(key_name, namespace)
);

CREATE INDEX idx_translation_keys_namespace ON translation_keys(namespace);
CREATE INDEX idx_translation_keys_key_name ON translation_keys(key_name);

-- Translation Values table
CREATE TABLE translation_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    value_text TEXT,
    company_id UUID, -- NULL for default translations, UUID for company-specific overrides
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(key_id, language, company_id)
);

-- Handle NULL company_id in unique constraint
CREATE UNIQUE INDEX idx_translation_values_default 
    ON translation_values(key_id, language) 
    WHERE company_id IS NULL;

CREATE INDEX idx_translation_values_key_id ON translation_values(key_id);
CREATE INDEX idx_translation_values_language ON translation_values(language);
CREATE INDEX idx_translation_values_company_id ON translation_values(company_id);
