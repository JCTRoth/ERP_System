# Translations System

## Overview

The ERP system uses a **two-layer translation system**:

1. **Local JSON files** (`apps/frontend/src/locales/en.json`, `de.json`, `fr.json`, `ru.json`) – ship with the frontend and provide instant fallback translations
2. **Backend Translation Service** (Java/Spring Boot, PostgreSQL) – stores overrides that take precedence over local JSON files

When the frontend loads, it first applies the local JSON translations, then fetches backend translations via GraphQL and **merges them on top**. Any key set in the backend overrides the local file.

## Architecture

```
┌─────────────────────────────┐
│         Frontend            │
│  ┌──────────┐ ┌───────────┐ │
│  │ en.json   │ │ Backend   │ │
│  │ de.json   │ │ Override  │ │
│  │ (fallback)│ │ (GraphQL) │ │
│  └────┬─────┘ └─────┬─────┘ │
│       └──────┬──────┘       │
│        MERGE (backend wins) │
│              │              │
│      ┌───────▼───────┐     │
│      │  useI18n()     │     │
│      │  t('key.name') │     │
│      └───────────────┘     │
└─────────────────────────────┘
```

## Managing Translations

### Via the UI (/translations)

1. Navigate to **Translations** in the sidebar
2. Browse all translation keys, filter by namespace, and search
3. Click the edit icon to modify a translation value for any language
4. Click **Add Key** to create a new translation key
5. Use the **copy icon** next to any key to copy its `$t{key}` reference

### Key Format

Translation keys follow the pattern `namespace.keyName`:
- `nav.dashboard` → namespace: `nav`, key: `dashboard`
- `accounting.invoices` → namespace: `accounting`, key: `invoices`
- `auth.error.invalidPassword` → namespace: `auth`, key: `error.invalidPassword`

### Available Namespaces

| Namespace     | Usage                                |
|:------------- |:------------------------------------ |
| `accounting`  | Accounting module labels and actions |
| `auth`        | Login, password reset, auth errors   |
| `common`      | Shared actions (Save, Cancel, etc.)  |
| `companies`   | Company management                   |
| `dashboard`   | Dashboard metrics and sections       |
| `errors`      | Error pages and messages             |
| `masterdata`  | Master data entities and fields      |
| `nav`         | Navigation menu items and tooltips   |
| `orders`      | Order management                     |
| `products`    | Product catalog                      |
| `settings`    | Application settings                 |
| `shortcuts`   | Keyboard shortcuts                   |
| `templates`   | Document template management         |
| `translations`| Translation management page          |
| `uiBuilder`   | UI Builder page                      |
| `users`       | User management                      |

## `$t{key}` Reference Syntax

Use the `$t{key.name}` syntax to embed translation references in:

### UI Builder

In the **UI Builder** page, any text/content/label property can contain `$t{}` references:

```
$t{nav.dashboard}          → "Dashboard"
$t{common.save}            → "Save"
Welcome to $t{nav.orders}  → "Welcome to Orders"
```

- In the **Properties Panel**, click the **$t{}** button next to text fields to pick from available translation keys
- The **Preview** resolves all `$t{}` references into translated text
- **Code Export** converts `$t{key}` to `{t('key')}` in the generated React component

### Template Editor

In the **Template Editor** (document templates), use `$t{}` alongside regular template variables:

```asciidoc
= $t{templates.documentType.invoice}

$t{common.date}: {order.date}

$t{orders.orderNumber}: {order.number}

|===
| $t{orders.product} | $t{orders.qty} | $t{orders.price}

{#items}
| {item.name} | {item.quantity} | {item.price}
{#end}
|===
```

The Template Service resolves `$t{}` references **before** variable substitution, using the template's language setting to fetch the appropriate translations.

### Syntax Highlighting

Both the Template Editor and Script Editor use **Monaco Editor** with custom syntax highlighting:

| Syntax              | Color  | Meaning              |
|:-------------------- |:------ |:-------------------- |
| `$t{key.name}`      | Teal   | Translation reference |
| `{var.path}`        | Blue   | Data variable         |
| `{#name}...{#end}`  | Purple | Loop block            |
| `= Heading`         | Yellow | AsciiDoc heading      |
| `// comment`        | Green  | Comment               |

The editor also provides **autocomplete** for translation keys — type `$t{` and a dropdown will suggest available keys.

## Override Precedence

The resolution order for translations is:

1. **Company-specific override** (set for a specific company)
2. **Default translation** (set via /translations page, applies to all companies)
3. **Fallback language** (English) if the requested language has no value
4. **Local JSON file** (built-in frontend translations)
5. **Key name** (displayed as last resort, with dots replaced by spaces)

## API

### GraphQL Queries

```graphql
# Get all translations for a language
query {
  translations(language: "en", companyId: "uuid") {
    key
    value
  }
}

# Get all translation keys with their values
query {
  translationKeys {
    id
    keyName
    namespace
    values {
      language
      valueText
    }
  }
}
```

### GraphQL Mutations

```graphql
# Create a new translation key
mutation {
  createTranslationKey(input: {
    keyName: "myKey"
    namespace: "custom"
    description: "My custom key"
  }) {
    id
    keyName
  }
}

# Set a translation value
mutation {
  setTranslation(input: {
    keyName: "myKey"
    namespace: "custom"
    language: "en"
    value: "My translated value"
  }) {
    id
    valueText
  }
}
```

## Development

### Adding New Frontend Keys

1. Add the key and English value to `apps/frontend/src/locales/en.json`
2. Add translations to `de.json`, `fr.json`, `ru.json`
3. Use `t('namespace.keyName')` in React components via `useI18n()`
4. (Optional) Create a Flyway migration to seed the key in the backend database

### Template Service Integration

The Templates Service (`apps/services/nodejs/templates-service/server.mjs`) fetches translations from the Gateway at render time:

- Translations are cached in memory for 5 minutes
- The template's `language` field determines which translations to fetch
- `$t{}` references are resolved before variable substitution
- Unresolved keys are left as-is in the output

### Cache Management

The template service caches translations for 5 minutes. To force a refresh:
- Wait for the cache to expire, or
- Restart the templates-service container
