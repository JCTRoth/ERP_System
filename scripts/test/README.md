# scripts/test — Integration & E2E Tests

Scripts for validating services, GraphQL queries, federation, and end-to-end flows.

## Scripts

| Script | Purpose |
|---|---|
| `test-all-services.sh` | Comprehensive federation and service integration tests (run all) |
| `test-docker-network.sh` | Test service connectivity inside the Docker network |
| `test-federation.sh` | Apollo Federation tests through the gateway |
| `test-graphql-queries.sh` | Test all GraphQL queries against the running gateway |
| `test-frontend-queries.sh` | Test queries specifically exercised by the frontend |
| `test-e2e-playwright.sh` | Playwright browser E2E suite (apps/e2e): auth, dashboard, users, companies, translations, navigation, settings, webshop |
| `test-e2e-order-email-flow.sh` | E2E: create an order and verify the email notification flow |
| `test-order-invoice-flow.sh` | E2E: order → payment → invoice + document generation |
| `test-notification-email.sh` | Comprehensive email notification service tests |
| `test-notification-send-email.sh` | Test the `sendEmail` GraphQL mutation on the notification service |
| `test-smtp-config.sh` | Verify SMTP configuration is correct and reachable |

## Usage

Run from the **repository root** (requires all services to be running — see `scripts/dev/start-local.sh`):

```bash
# Run all service tests
./scripts/test/test-all-services.sh

# Test GraphQL federation through the gateway
./scripts/test/test-federation.sh

# Run E2E order-to-email test
./scripts/test/test-e2e-order-email-flow.sh

# Run the Playwright browser E2E suite
./scripts/test/test-e2e-playwright.sh
```

### Playwright E2E (test-e2e-playwright.sh)

The Playwright suite lives in `apps/e2e` and can also be run directly:

```bash
# From the repository root (browsers must be installed first)
npm run e2e:install   # installs the Chromium browser
npm run test:e2e      # runs the full suite (frontend + webshop)

# Run a single project or test file
npm --workspace @erp/e2e run test:webshop
npx playwright test users.spec.ts --project=chromium
```

Key behaviour:

- **Authentication first**: the login flow is always the very first test executed
  (dedicated `setup` project).
- **Fail-fast**: if the authentication test fails, the entire suite stops
  immediately — no other test runs.
- Uses the seeded super admin (`admin@erp-system.local` / `Admin123!`) by
  default; override via `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.
- Targets `http://localhost:5173` (frontend) and `http://localhost:3008`
  (webshop) by default; override via `E2E_BASE_URL` / `E2E_WEBSHOP_URL`.
- In CI the stack is started with `docker-compose.prod-local.yml` and the
  suite runs against `http://localhost:8088`.
