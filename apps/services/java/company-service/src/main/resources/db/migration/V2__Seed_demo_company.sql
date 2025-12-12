-- V2__Seed_demo_company.sql
-- Seed Demo_Corporation

INSERT INTO companies (name, is_demo, settings_json)
VALUES ('Demo_Corporation', true, '{"theme": "default", "timezone": "UTC"}')
ON CONFLICT (name) DO NOTHING;
