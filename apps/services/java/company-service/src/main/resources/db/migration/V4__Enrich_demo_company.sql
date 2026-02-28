-- V4__Enrich_demo_company.sql
-- Add description, logo_url and stats to MediVita demo company for multi-tenant dashboard

-- Set top-level description (used by GraphQL company query in dashboard)
UPDATE companies
SET description = 'We specialize in innovative pharmaceuticals, blending advanced science with a passion for well-being. Our mission: to deliver trusted, effective solutions for a healthier world.'
WHERE slug = 'medivita' AND is_demo = true;

-- Add stats array to settings_json for dashboard display
UPDATE companies
SET settings_json = settings_json || '{
  "stats": [
    {"value": "98%", "label": "Customer Satisfaction"},
    {"value": "50+", "label": "Products"},
    {"value": "125+", "label": "Countries"},
    {"value": "20+", "label": "Years"}
  ]
}'::jsonb
WHERE slug = 'medivita' AND is_demo = true;
