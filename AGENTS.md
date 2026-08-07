<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

# Playwright E2E Tests

The end-to-end browser suite lives in `apps/e2e` (`@erp/e2e`). These rules are
mandatory for any agent writing or maintaining Playwright tests.

## Non-negotiable rules

- **Authentication first**: the login flow in `tests/auth.setup.ts` is the very
  first test of the suite (dedicated `setup` project). Never reorder it, never
  remove it, and never let another test run before it.
- **Fail-fast**: if the auth test fails, the whole suite must stop. Preserve
  `workers: 1`, `maxFailures: 1`, and the `dependencies: ['setup']` on every
  test project in `playwright.config.ts`.
- **Never bypass auth**: authenticated tests must use the shared
  `storageState` (`utils/paths.ts` → `AUTH_STORAGE_STATE`). Only use
  `storageState: { cookies: [], origins: [] }` to deliberately test the login
  page (see `tests/auth.spec.ts`).
- **Seeded credentials only**: default test user is the seeded super admin
  `admin@erp-system.local` / `Admin123!` (UserService seed). Always read
  credentials from env (`E2E_USER_EMAIL` / `E2E_USER_PASSWORD`); never commit
  real or new credentials, and never create permanent users inside a test.

## Running

- Run through nx or the workspace scripts: `nx run e2e:e2e`,
  `npm run test:e2e`, or `./scripts/test/test-e2e-playwright.sh`.
- The suite requires the real backend stack (start `scripts/dev/start-local.sh`
  or `docker compose -f docker-compose.prod-local.yml up -d --build`).
- Selectors assume an English UI — the config pins `locale: 'en-US'`; don't
  rely on non-English labels.

## Writing tests

- Prefer role/label based queries: `getByRole`, `getByLabel`, `getByText` —
  add `data-testid` only when nothing else is stable.
- Keep tests independent and deterministic: no shared mutable state, no
  hard-coded sleeps — use `expect(...).toBeVisible()` polling.
- Don't create/delete database records inside tests (no destructive or
  polluting mutations); assert on seeded data and read-only interactions.
- New features must come with e2e coverage (a focused spec in `apps/e2e/tests/`).
- Run the suite locally before finishing; keep CI green.