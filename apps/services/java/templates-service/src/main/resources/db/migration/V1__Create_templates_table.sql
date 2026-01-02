CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    title VARCHAR(255) NOT NULL,
    key VARCHAR(150) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    document_type VARCHAR(50),
    assigned_state VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

CREATE INDEX idx_templates_assigned_state ON templates(assigned_state);
CREATE INDEX idx_templates_key_language ON templates(key, language);
CREATE INDEX idx_templates_company_id ON templates(company_id);
CREATE INDEX idx_templates_active ON templates(is_active);
