-- V4__Add_attachments_json_column.sql
-- Align schema with EmailNotification entity

ALTER TABLE email_notifications
ADD COLUMN IF NOT EXISTS attachments_json TEXT;
