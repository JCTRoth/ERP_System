# Knip Dead-Code Report

Generated: 2026-08-07 · Tool: [knip](https://knip.dev) 6.32.0 · Scope: whole monorepo
(JS/TS workspaces: root, `apps/frontend`, `apps/webshop`, `apps/gateway`,
`apps/e2e`, `libs/i18n`, `libs/shared-types`, `apps/services/nodejs/templates-service`)

## How to run

```bash
npm run knip            # full report (add: scripts.knip = "knip")
npx knip                # one-off
npx knip --reporter compact
```

Configuration lives in `knip.config.ts` (entry points, ignores for
toolchain/config-referenced files, and documented false positives).

## What was removed

### Unused files (6)

| File | Reason |
|---|---|
| `apps/frontend/src/pages/accounting/JournalEntriesTab.tsx` | Not imported by `AccountingPage` (only Invoices/Payments/Accounts/Bookings tabs are used) |
| `apps/frontend/src/pages/accounting/ReportsTab.tsx` | Same — no references anywhere |
| `apps/frontend/src/pages/ui-builder/components/ComponentPalette.tsx` | No references anywhere |
| `apps/frontend/src/test/utils.tsx` | `customRender` helper never imported by any test |
| `apps/services/nodejs/templates-service/scripts/local_pdf_test.mjs` | Unreferenced manual dev script |
| `apps/services/nodejs/templates-service/scripts/normalize_test.mjs` | Unreferenced manual dev script |

### Unused dependencies (removed from `package.json`)

| Package | Removed from |
|---|---|
| `@hookform/resolvers`, `clsx`, `date-fns`, `lucide-react`, `react-hook-form`, `react-hot-toast`, `tailwind-merge`, `zod` | `apps/frontend/package.json` (runtime) — never imported in `src/` |
| `@testing-library/user-event`, `@types/jszip`, `eslint-plugin-react-refresh` | `apps/frontend/package.json` (dev) — not used by tests or the ESLint config; `jszip` bundles its own types |
| `@apollo/composition` | `apps/gateway/package.json` — not imported (gateway uses `IntrospectAndCompose` from `@apollo/gateway`) |
| `node-fetch` | `apps/services/nodejs/templates-service/package.json` — never imported |
| `@monaco-editor/react`, `jszip` | root `package.json` — redundant copies; already declared in `apps/frontend/package.json` |

### Unused exports (removed / de-exported)

| File | Removed |
|---|---|
| `components/ErrorBoundary.tsx` | `withErrorBoundary` HOC (whole function) |
| `components/KeyboardShortcutsProvider.tsx` | `useKeyboardShortcutsContext` hook (plus now-unused `useContext` import) |
| `lib/api/templates.ts` | `getContextSamples` function |
| `lib/apollo.ts` | `export` on `shopApolloClient` (kept internal; `getShopApolloClient` still uses it) |
| `lib/templateUtils.ts` | `GET_ORDER_DETAILS` GraphQL const (pages define their own local copy) |
| `pages/ui-builder/scriptRuntime.ts` | `export` on `createERPRuntime` (internal use only) |
| `pages/ui-builder/types.ts` | `export` on `getValidStartColumns`, `getRemainingColumnsInRow` (internal use only) |
| `pages/ui-builder/utils/gridSnap.ts` | `getSlotRegions`, `calculateSnapPosition`, `getGridGuides` + types `SlotRegion`, `SnapPosition`, `GridGuide` (dead — `getRowSlots` retained) |
| `utils/translationResolver.ts` | `hasTranslationRefs` (dead); `export` on `resolveTranslationRefs` (internal use only) |
| `webshop/src/graphql/mutations.ts` | `CREATE_PAYMENT` GraphQL const |
| `webshop/src/lib/utils.ts` | `slugify` function |

### Unused exported types (de-exported, still used internally)

`TooltipPosition` (Tooltip.tsx), `TemplatePreviewState` (useTemplatePreview.ts),
`CurrencyData` (CurrencyModal.tsx), `PaymentTermData` (PaymentTermModal.tsx),
`LoginCredentials`/`LoginResult`/`PasswordResetResult` (authService.ts),
`ScopeGrant` (authStore.ts), `InfoPageSection` (infoPages.ts), `CartItem`/`Cart`
(CartContext.tsx).

`UserRole` (authStore.ts) was deleted entirely (unused even internally;
the shared type lives in `libs/shared-types`).

## Remaining findings (kept intentionally — NOT dead code)

| Finding | Why it is kept |
|---|---|
| `mustache` (templates-service, dynamic import) | Loaded via `requireCJS('mustache')` — knip cannot resolve dynamic requires; it is used at runtime. Ignored in `knip.config.ts`. |
| `asciidoctor.js` (templates-service, unlisted dependency) | `server.mjs` imports it in a fallback path (`server.mjs:994`); the working path uses the declared `@asciidoctor/core`. It is live code with an undeclared runtime dependency, not dead code. **Action (optional):** declare/install `asciidoctor.js` or remove the fallback import. |
| `asciidoctor-pdf` (templates-service, unlisted binary) | Invoked via `spawnSync('asciidoctor-pdf')` for PDF generation — a runtime CLI, not an npm import. Not dead code. |
| `.github/skills/monitor-ci/scripts/*.mjs` | Referenced from skill/prompt markdown (`node <skill_dir>/scripts/...`); `.github/**` is ignored. |
| `scripts/translation/sync-translations-from-locales.mjs` | Documented manual utility (`scripts/translation/README.md`); registered as an entry point. |
| `apps/frontend/vite.config.d.ts` | Mounted by `docker-compose.dev.yml`; ignored in config. |
| Nx/ESLint toolchain packages (`nx`, `@nx/*`, `eslint`, `@typescript-eslint/*`, eslint plugins) | Consumed via `nx.json`/`project.json`/`.eslintrc.*` and the lint workflow; ignored in config. |

`knip` still exits non-zero solely because of the two `asciidoctor*` unlisted
findings above (live runtime dependencies, not removable dead code).

## Verification

| Check | Result |
|---|---|
| `npm run build` (Nx: frontend + webshop + libs) | ✅ Success |
| `npm run lint` (Nx) | ✅ Success |
| Frontend unit tests (`vitest`) | ✅ 17 passed |
| Playwright E2E suite (`apps/e2e`) | ✅ 23 passed |
| Gateway `node --check` + removed dep not referenced | ✅ |
| Templates-service `node --check` + removed dep not referenced | ✅ |
