# scripts/dev — Local Development

Scripts for starting and stopping the ERP System locally via Docker Compose.

## Scripts

| Script | Purpose |
|---|---|
| `start-local.sh` | Start the complete stack locally with health checks and ordered startup |
| `stop-local.sh` | Safely stop and remove all ERP System containers |

## Usage

Run from the **repository root**:

```bash
# Start all services
./scripts/dev/start-local.sh

# Stop all services
./scripts/dev/stop-local.sh
```

## Startup order

1. Pre-flight checks (Docker, compose file availability)
2. Port availability checks
3. PostgreSQL (waits for healthy)
4. All GraphQL microservices (waits for healthy)
5. Apollo Gateway
6. Frontend

The frontend is accessible at `http://localhost:5173` and the gateway at `http://localhost:4000`.
