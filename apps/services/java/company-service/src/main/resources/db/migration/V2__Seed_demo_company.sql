-- V2__Seed_demo_company.sql
-- Seed Demo_Corporation

INSERT INTO companies (name, slug, is_demo, settings_json)
VALUES ('Demo_Corporation', 'demo-corporation', true, '{"theme": "default", "timezone": "UTC"}')
