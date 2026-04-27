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
```

## Notes

- All tests target `http://localhost:4000/graphql` (Apollo Gateway) by default.
- Run `scripts/dev/start-local.sh` before executing any tests.
- Exit code `0` = all tests passed; non-zero = one or more failures.
