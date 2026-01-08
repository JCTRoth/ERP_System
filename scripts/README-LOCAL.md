# ERP System Local Development

This script provides an easy way to start the complete ERP system locally for development.

## Prerequisites

- Docker and Docker Compose installed and running
 - At least 4GB of available RAM
 - Ports 4000, 5000, 5173, 5432-5439, 9000-9001 available

## Usage

### Start the system
```bash
./start-local.sh start
# or simply:
./start-local.sh
```

### Stop the system
```bash
./start-local.sh stop
```

### Check status
```bash
./start-local.sh status
```

### Show help
```bash
./start-local.sh help
```

## What the script does

1. **Checks prerequisites**: Ensures Docker is running and compose file exists
2. **Starts infrastructure**: PostgreSQL databases and MinIO
3. **Waits for databases**: Ensures all databases are ready before proceeding
4. **Starts services**: UserService, Gateway, and Frontend
5. **Health checks**: Verifies core services are responding
6. **Shows access info**: Displays URLs and login credentials

## Access Points

After startup, you can access:

- **Frontend**: http://localhost:5173
- **GraphQL Gateway**: http://localhost:4000/graphql
- **UserService API**: http://localhost:5000/graphql
- **MinIO Storage**: http://localhost:9001 (admin/admin)

## Login Credentials

- **Email**: admin@erp-system.local
- **Password**: Admin123!

## Services Status

The script starts the core working services. Currently, only UserService is active in GraphQL federation:

- ✅ UserService (.NET) - Authentication & user management (active in federation)
- ✅ Gateway (Node.js) - GraphQL federation (configured for UserService only)
- ✅ Frontend (React/Vite) - Web interface
- ✅ Databases (PostgreSQL) - Data persistence
- ✅ MinIO - File storage
- ✅ MinIO - File storage
- ⚠️ TranslationService - Java build issues, not in federation
- ⚠️ CompanyService - Java build issues, not in federation
- ⚠️ AccountingService - Missing DTOs, not in federation
- ⚠️ MasterdataService - Fixed but needs rebuild, not in federation
- ⚠️ ShopService - Not tested, not in federation

## Troubleshooting

If services fail to start:
1. Check Docker resources (memory, CPU)
2. Ensure ports are not in use by other applications
3. Run `./start-local.sh stop` then `./start-local.sh start`
4. Check logs: `docker logs <container_name>`

## Development Workflow

1. Start the system: `./start-local.sh`
2. Make code changes
3. Services will hot-reload automatically (for supported services)
4. Stop when done: `./start-local.sh stop`