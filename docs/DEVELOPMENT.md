# Development Environment Setup

Complete guide for setting up the local development environment.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| .NET SDK | 8.0 | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| Java JDK | 21 | [adoptium.net](https://adoptium.net) |
| Docker | Latest | [docker.com](https://docker.com) |
| Docker Compose | v2+ | Included with Docker Desktop |

### Optional Tools

| Tool | Purpose |
|------|---------|
| VS Code | Recommended IDE |
| Rider | .NET development |
| IntelliJ IDEA | Java development |
| DBeaver | Database management |
| Postman | API testing |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ERP_System.git
cd ERP_System
```

### 2. Install Dependencies

```bash
# Root workspace
npm install

# Frontend
cd apps/frontend
npm install

# Gateway
cd ../gateway
npm install
```

### 3. Start Development Environment

```bash
# Start all services with Docker
docker-compose -f docker-compose.dev.yml up -d

# Or start individual components:
docker-compose -f docker-compose.dev.yml up -d postgres-users postgres-shop
```

### 4. Run Frontend

```bash
cd apps/frontend
npm run dev
```

Frontend available at: http://localhost:5173

### 5. Run Backend Services

**.NET Services:**
```bash
cd apps/services/dotnet/UserService
dotnet run

cd ../ShopService
dotnet run
```

**Java Services:**
```bash
cd apps/services/java/company-service
./gradlew bootRun
```

## Environment Configuration

### Frontend (.env.local)

Create `apps/frontend/.env.local`:

```env
VITE_GATEWAY_URL=http://localhost:4000
VITE_APP_TITLE=ERP System (Dev)
```

### .NET Services (appsettings.Development.json)

Each .NET service has its own `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=userdb;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "your-super-secret-key-at-least-256-bits-long-for-hs256",
    "Issuer": "ERP_System",
    "Audience": "ERP_System"
  }
}
```

### Java Services (application-dev.yml)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5433/companydb
    username: postgres
    password: postgres
```

## Database Setup

### Connection Details

| Service | Database | Host | Port |
|---------|----------|------|------|
| UserService | userdb | localhost | 5432 |
| CompanyService | companydb | localhost | 5433 |
| NotificationService | notificationdb | localhost | 5434 |
| TranslationService | translationdb | localhost | 5435 |
| ShopService | shopdb | localhost | 5436 |
| AccountingService | accountingdb | localhost | 5437 |
| MasterdataService | masterdatadb | localhost | 5438 |

### Database Migrations

**.NET (Entity Framework):**
```bash
cd apps/services/dotnet/UserService
dotnet ef database update
```

**Java (Flyway):**
Migrations run automatically on startup.

### Seed Data

```bash
# Apply seed configuration
# Seeds are loaded from config/seed.json on first startup
```

## IDE Setup

### VS Code Extensions

Recommended extensions (install via Extensions panel):

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **C# Dev Kit** - .NET development
- **Extension Pack for Java** - Java development
- **Docker** - Container management
- **GraphQL** - GraphQL syntax support
- **Tailwind CSS IntelliSense** - CSS utilities

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[csharp]": {
    "editor.defaultFormatter": "ms-dotnettools.csharp"
  },
  "[java]": {
    "editor.defaultFormatter": "redhat.java"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Running Tests

### Frontend

```bash
cd apps/frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### .NET

```bash
cd apps/services/dotnet/UserService.Tests
dotnet test

# With coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Java

```bash
cd apps/services/java/company-service
./gradlew test
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### Docker Network Issues

```bash
# Reset Docker networks
docker-compose down
docker network prune
docker-compose up -d
```

#### Database Connection Failed

1. Ensure PostgreSQL container is running:
   ```bash
   docker-compose ps
   ```
2. Check container logs:
   ```bash
   docker-compose logs postgres-users
   ```

#### .NET Build Errors

```bash
# Clean and rebuild
dotnet clean
dotnet restore
dotnet build
```

#### Node Module Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Useful Commands

### Docker

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f <service>

# Rebuild specific service
docker-compose build <service>

# Stop all services
docker-compose down

# Remove all data
docker-compose down -v
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it erp_postgres-users_1 psql -U postgres -d userdb

# Export database
pg_dump -h localhost -U postgres userdb > backup.sql
```

### Git

```bash
# Update from upstream
git fetch origin
git rebase origin/develop
```

## Next Steps

1. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
2. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system overview
3. Check [docs/API.md](./docs/API.md) for API documentation
