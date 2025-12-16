-- V3__Add_company_fields.sql
-- Add missing fields to companies table

ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug VARCHAR(255) NOT NULL UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for slug
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
