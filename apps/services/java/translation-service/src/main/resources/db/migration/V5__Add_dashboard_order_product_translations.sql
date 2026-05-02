-- V5__Add_dashboard_order_product_translations.sql
-- Add dashboard.totalOrders and dashboard.totalProducts translations

CREATE TEMP TABLE tmp_locale_seed_v5 (
  full_key TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  value_text TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_locale_seed_v5 (full_key, language, value_text) VALUES
('dashboard.totalOrders','en','Total Orders'),
('dashboard.totalOrders','de','Anzahl Bestellungen'),
('dashboard.totalOrders','fr','Total Commandes'),
('dashboard.totalOrders','ru','Всего заказов'),
('dashboard.totalProducts','en','Total Products'),
('dashboard.totalProducts','de','Anzahl Produkte'),
('dashboard.totalProducts','fr','Total Produits'),
('dashboard.totalProducts','ru','Всего товаров');

-- Insert keys that don't exist yet
INSERT INTO translation_keys (namespace, key_name)
SELECT DISTINCT
  split_part(t.full_key, '.', 1),
  substring(t.full_key from position('.' in t.full_key) + 1)
FROM tmp_locale_seed_v5 t
WHERE NOT EXISTS (
  SELECT 1 FROM translation_keys tk
  WHERE tk.namespace = split_part(t.full_key, '.', 1)
    AND tk.key_name = substring(t.full_key from position('.' in t.full_key) + 1)
);

-- Insert values that don't exist yet
INSERT INTO translation_values (key_id, language, value_text, company_id)
SELECT
  tk.id,
  s.language,
  s.value_text,
  NULL
FROM (
  SELECT
    split_part(t.full_key, '.', 1) AS namespace,
    substring(t.full_key from position('.' in t.full_key) + 1) AS key_name,
    t.language,
    t.value_text
  FROM tmp_locale_seed_v5 t
) s
JOIN translation_keys tk
  ON tk.namespace = s.namespace
 AND tk.key_name = s.key_name
WHERE NOT EXISTS (
  SELECT 1 FROM translation_values tv
  WHERE tv.key_id = tk.id
    AND tv.language = s.language
    AND tv.company_id IS NULL
);
