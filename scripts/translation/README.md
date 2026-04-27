# scripts/translation — Translation Utilities

Scripts for syncing and generating translation/i18n data.

## Scripts

| Script | Purpose |
|---|---|
| `sync-translations-from-locales.mjs` | Sync translation keys from frontend locale JSON files into the translation service database seed |
| `generate_translation_seed_migration.py` | Generate a database migration SQL file from the current locale JSON files |

## Usage

Run from the **repository root**:

```bash
# Sync translations to seed data
node scripts/translation/sync-translations-from-locales.mjs

# Generate migration SQL from locale files
python3 scripts/translation/generate_translation_seed_migration.py
```

## Notes

- Locale JSON files live in `apps/frontend/src/locales/`.
- Generated migration output goes to the translation service's migration directory.
- Run these after adding or changing i18n keys in the frontend.
