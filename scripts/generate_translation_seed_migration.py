import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
locales_dir = root / 'apps/frontend/src/locales'
langs = ['en', 'de', 'fr', 'ru']
locales = {l: json.loads((locales_dir / f'{l}.json').read_text()) for l in langs}
keys = sorted(locales['en'].keys())
out = root / 'apps/services/java/translation-service/src/main/resources/db/migration/V4__Seed_all_locale_json_translations.sql'

def esc(value: str) -> str:
    return value.replace("'", "''")

lines = []
lines.append('-- V4__Seed_all_locale_json_translations.sql')
lines.append('-- One-time seed from frontend locale JSON files (en/de/fr/ru)')
lines.append('-- Seeds default translations only (company_id IS NULL)')
lines.append('')
lines.append('CREATE TEMP TABLE tmp_locale_seed (')
lines.append('  full_key TEXT NOT NULL,')
lines.append('  language VARCHAR(10) NOT NULL,')
lines.append('  value_text TEXT NOT NULL')
lines.append(') ON COMMIT DROP;')
lines.append('')
lines.append('INSERT INTO tmp_locale_seed (full_key, language, value_text) VALUES')

values = []
for key in keys:
    for lang in langs:
        value = locales[lang].get(key) or locales['en'].get(key) or ''
        values.append(f"('{esc(key)}','{lang}','{esc(str(value))}')")

lines.append(',\n'.join(values) + ';')
lines.append('')
lines.append('-- Ensure translation_keys exist for all seeded keys')
lines.append('INSERT INTO translation_keys (key_name, namespace, description)')
lines.append('SELECT DISTINCT')
lines.append("  substring(full_key from position('.' in full_key) + 1) AS key_name,")
lines.append("  split_part(full_key, '.', 1) AS namespace,")
lines.append("  MIN(CASE WHEN language = 'en' THEN value_text ELSE NULL END) AS description")
lines.append('FROM tmp_locale_seed')
lines.append("WHERE position('.' in full_key) > 0")
lines.append('GROUP BY full_key')
lines.append('ON CONFLICT (key_name, namespace) DO NOTHING;')
lines.append('')
lines.append('-- Update existing default translation values')
lines.append('UPDATE translation_values tv')
lines.append('SET value_text = s.value_text,')
lines.append('    updated_at = NOW()')
lines.append('FROM (')
lines.append('  SELECT')
lines.append("    split_part(t.full_key, '.', 1) AS namespace,")
lines.append("    substring(t.full_key from position('.' in t.full_key) + 1) AS key_name,")
lines.append('    t.language,')
lines.append('    t.value_text')
lines.append('  FROM tmp_locale_seed t')
lines.append(') s')
lines.append('JOIN translation_keys tk')
lines.append('  ON tk.namespace = s.namespace')
lines.append(' AND tk.key_name = s.key_name')
lines.append('WHERE tv.key_id = tk.id')
lines.append('  AND tv.language = s.language')
lines.append('  AND tv.company_id IS NULL;')
lines.append('')
lines.append('-- Insert missing default translation values')
lines.append('INSERT INTO translation_values (key_id, language, value_text, company_id)')
lines.append('SELECT')
lines.append('  tk.id,')
lines.append('  s.language,')
lines.append('  s.value_text,')
lines.append('  NULL')
lines.append('FROM (')
lines.append('  SELECT')
lines.append("    split_part(t.full_key, '.', 1) AS namespace,")
lines.append("    substring(t.full_key from position('.' in t.full_key) + 1) AS key_name,")
lines.append('    t.language,')
lines.append('    t.value_text')
lines.append('  FROM tmp_locale_seed t')
lines.append(') s')
lines.append('JOIN translation_keys tk')
lines.append('  ON tk.namespace = s.namespace')
lines.append(' AND tk.key_name = s.key_name')
lines.append('LEFT JOIN translation_values tv')
lines.append('  ON tv.key_id = tk.id')
lines.append(' AND tv.language = s.language')
lines.append(' AND tv.company_id IS NULL')
lines.append('WHERE tv.id IS NULL;')

out.write_text('\n'.join(lines))
print(f'Wrote {out} with {len(values)} value rows')
