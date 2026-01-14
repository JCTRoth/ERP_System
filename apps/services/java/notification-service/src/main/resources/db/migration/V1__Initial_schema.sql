-- V1__Initial_schema.sql
-- Notification Service Database Schema

-- Email notifications table
CREATE TABLE email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    template_name VARCHAR(100),
    template_data TEXT,
    body_html TEXT,
    body_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, language, company_id)
);

-- Indexes
CREATE INDEX idx_notifications_company ON email_notifications(company_id);
CREATE INDEX idx_notifications_user ON email_notifications(user_id);
CREATE INDEX idx_notifications_status ON email_notifications(status);
CREATE INDEX idx_notifications_created ON email_notifications(created_at);
CREATE INDEX idx_templates_company ON email_templates(company_id);
CREATE INDEX idx_templates_name_lang ON email_templates(name, language);
