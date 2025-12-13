# ERP System

A modern, full-stack Enterprise Resource Planning (ERP) system built with microservices architecture.

## Architecture Overview

The ERP System is built using a microservices architecture with the following components:

### Services

| Service | Technology | Port | Description |
|---------|------------|------|-------------|
| Frontend | React + TypeScript | 3000 | Web application UI |
| Gateway | Apollo Gateway | 4000 | GraphQL Federation gateway |
| UserService | .NET 8 | 5000 | User management and authentication |
| ShopService | .NET 8 | 5003 | E-commerce and inventory |
| AccountingService | .NET 8 | 5001 | Financial accounting |
| MasterdataService | .NET 8 | 5002 | Master data management |
| CompanyService | Java Spring | 8081 | Company management |
| NotificationService | Java Spring | 8082 | Email/Push notifications |
| TranslationService | Java Spring | 8083 | i18n translations |
| ScriptingService | Java Spring | 8084 | Custom scripting |
| EdifactService | Java Spring | 8085 | EDI/EDIFACT processing |

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Apollo Client
- **Backend (.NET)**: .NET 8, HotChocolate GraphQL, Entity Framework Core
- **Backend (Java)**: Spring Boot 3.2, Netflix DGS GraphQL
- **Databases**: PostgreSQL (separate DB per service)
- **Gateway**: Apollo Gateway (Federation)
- **Infrastructure**: Docker, Kubernetes (Helm), Nginx

## Getting Started

Pre Note
Development: Docker Compose → Testing → CI/CD → Production: Kubernetes

### Prerequisites

- Node.js 20+
- .NET 8 SDK
- Java 21 JDK
- Docker & Docker Compose
- PostgreSQL 15+

### System Requirements

#### Production Environment

**Software Requirements:**
- Kubernetes cluster

**Hardware Requirements:**
- **RAM**: Minimum 4GB per service instance, 8GB recommended for optimal performance
- **CPU**: 2+ cores per service
- **Storage**: 20GB+ available disk space
- **Network**: Stable internet connection for external services

**JVM Memory Configuration:**
- Translation Service: -Xmx1024m (1GB heap)
- Other Java Services: -Xmx2048m (2GB heap) recommended
- .NET Services: 512MB minimum per service

#### Development Environment

**Software Requirements:**
- Java Development Kit (JDK) 21
- .NET 8 SDK
- Node.js 20+ with npm
- Docker & Docker Compose
- PostgreSQL 15+ (local or containerized)
- IDE with Java 21, .NET 8, and TypeScript support (VS Code, IntelliJ IDEA, etc.)
- Git for version control

**Hardware Requirements:**
- **RAM**: Minimum 8GB, 16GB recommended for running all services simultaneously
- **CPU**: 4+ cores recommended
- **Storage**: 30GB+ available disk space
- **Network**: Stable internet connection for package downloads

**Development Memory Allocation:**
- Frontend development: 2GB RAM
- Individual service development: 2-4GB RAM per service
- Full stack development: 8GB+ RAM total

### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd ERP_System

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Development Setup

#### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

#### .NET Services

```bash
cd apps/services/dotnet/UserService
dotnet restore
dotnet run
```

#### Java Services

```bash
cd apps/services/java/company-service
./gradlew bootRun
```

## Project Structure

```
ERP_System/
├── apps/
│   ├── frontend/          # React frontend application
│   ├── gateway/           # Apollo Federation gateway
│   └── services/
│       ├── dotnet/        # .NET microservices
│       │   ├── UserService/
│       │   ├── ShopService/
│       │   ├── AccountingService/
│       │   └── MasterdataService/
│       └── java/          # Java microservices
│           ├── company-service/
│           ├── notification-service/
│           ├── translation-service/
│           ├── scripting-service/
│           └── edifact-service/
├── config/                # Configuration files
├── infrastructure/        # Deployment configs
│   ├── helm/             # Kubernetes Helm charts
│   ├── nginx/            # Nginx configuration
│   ├── grafana/          # Monitoring dashboards
│   └── prometheus/       # Metrics collection
└── libs/                  # Shared libraries
    ├── i18n/             # Internationalization
    └── shared-types/     # Shared TypeScript types
```

## Authentication

The system uses JWT-based authentication:

- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)
- **JWT Secret**: Configurable via environment variables

Default demo credentials:
```
Email: admin@erp-system.local
Password: Admin123!
```

## API Documentation

### GraphQL Playground

Access the GraphQL Playground at:
- Gateway: http://localhost:4000/graphql
- UserService: http://localhost:5000/graphql
- ShopService: http://localhost:5003/graphql

### Example Queries

```graphql
# Get current user
query {
  me {
    id
    email
    firstName
    lastName
  }
}

# Get products
query {
  products(first: 10) {
    nodes {
      id
      name
      price
      stockQuantity
    }
  }
}

# Create order
mutation {
  createOrder(input: {
    customerId: "..."
    items: [{ productId: "...", quantity: 2 }]
  }) {
    id
    orderNumber
    status
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing key | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `GATEWAY_URL` | GraphQL Gateway URL | http://localhost:4000 |

### Service Configuration

Configuration files are located in `/config/`:
- `email.json` - Email service settings
- `i18n.json` - Internationalization settings
- `seed.json` - Database seed data
- `upload.json` - File upload settings

## Testing

### Frontend Tests

```bash
cd apps/frontend
npm run test
npm run test:coverage
```

### .NET Tests

```bash
cd apps/services/dotnet
dotnet test
```

### Java Tests

```bash
cd apps/services/java/company-service
./gradlew test
```

## Deployment

### Docker Compose (Development)

```bash
docker-compose up -d
```

### Kubernetes (Production)

```bash
helm install erp-system ./infrastructure/helm/erp-system
```

## Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.
