-- SMTP Configuration table
CREATE TABLE smtp_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(500), -- Encrypted
    email_from VARCHAR(255) NOT NULL,
    email_from_name VARCHAR(255),
    use_tls BOOLEAN DEFAULT true,
    use_ssl BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    CONSTRAINT unique_company_smtp UNIQUE (company_id)
);

-- Create index for active configuration lookups
CREATE INDEX idx_smtp_config_active ON smtp_configuration(is_active) WHERE is_active = true;
CREATE INDEX idx_smtp_config_company ON smtp_configuration(company_id);

-- Add comment
COMMENT ON TABLE smtp_configuration IS 'Stores SMTP server configuration for email sending. Database configuration overrides environment variables when present.';
COMMENT ON COLUMN smtp_configuration.smtp_password IS 'Password should be encrypted before storage';
COMMENT ON COLUMN smtp_configuration.company_id IS 'NULL for global configuration, specific UUID for company-specific settings';
