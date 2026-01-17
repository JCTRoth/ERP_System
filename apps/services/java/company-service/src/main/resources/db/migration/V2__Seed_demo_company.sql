-- V2__Seed_demo_company.sql
-- Seed MediVita - Crafting Health for Life

INSERT INTO companies (name, slug, is_demo, settings_json)
VALUES (
	'MediVita',
	'medivita',
	true,
	'{
		"theme": "healthcare",
		"tagline": "Crafting Health for Life",
		"industry": "pharmaceutical",
		"description": "Innovative pharmaceuticals blending advanced science with a passion for well-being. Our mission: to deliver trusted, effective solutions for a healthier world.",
		"timezone": "UTC",
		"contact": {
			"address": "Hauptstrasse 12",
			"postalCode": "12345",
			"city": "Berlin",
			"country": "Germany",
			"email": "info@medivita.example",
			"phone": "+49 30 1234567",
			"website": "https://www.medivita.example"
		}
	}'
)
