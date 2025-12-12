# Backend Services Architecture

## Overview

The ERP system uses a microservices architecture with services written in .NET 8 and Java Spring Boot 3.2. All services expose GraphQL APIs and participate in Apollo Federation.

## .NET Services

### Common Patterns

All .NET services follow these patterns:

- **GraphQL**: HotChocolate 14.0.0 with Apollo Federation
- **Database**: PostgreSQL with Entity Framework Core 8.0.2
- **Authentication**: JWT Bearer tokens
- **Architecture**: Clean architecture with separation of concerns

### UserService

Handles user authentication and management.

**Port**: 5000

**Features**:
- User CRUD operations
- JWT authentication (login, logout, refresh)
- Password hashing and validation
- Role and permission management

**Database Schema**:
```
Users
├── Id (GUID, PK)
├── Email (unique)
├── PasswordHash
├── FirstName
├── LastName
├── PreferredLanguage
├── CreatedAt
└── UpdatedAt
```

### ShopService

E-commerce and inventory management.

**Port**: 5003

**Features**:
- Product catalog management
- Category and brand hierarchies
- Inventory tracking
- Order processing
- Shopping cart
- Coupon/discount system
- Shipping methods
- Payment processing

**Key Entities**:
- Product, Category, Brand
- Customer, Supplier
- Order, OrderItem
- Cart, CartItem
- Inventory, StockMovement
- Coupon, ShippingMethod
- Payment

### AccountingService

Financial accounting and reporting.

**Port**: 5001

**Features**:
- Chart of accounts (double-entry bookkeeping)
- Invoice management (AR/AP)
- Journal entries
- Payment records
- Bank account reconciliation
- Tax rate management
- Fiscal period tracking
- Financial reports (Balance Sheet, Income Statement)

**Key Entities**:
- Account (Assets, Liabilities, Equity, Revenue, Expenses)
- Invoice, InvoiceLine
- JournalEntry, JournalLine
- PaymentRecord
- BankAccount
- TaxRate, FiscalPeriod

### MasterdataService

Master data management.

**Port**: 5002

**Features**:
- Customer master data
- Supplier master data
- Employee management
- Department/Cost center structure
- Location management
- Asset tracking
- Reference data (currencies, payment terms, UoM)

**Key Entities**:
- Customer, Supplier
- Employee, Department
- CostCenter, Location
- Asset, AssetCategory
- Currency, PaymentTerm
- UnitOfMeasure

## Java Services

### Common Patterns

All Java services use:

- **GraphQL**: Netflix DGS Framework
- **Database**: PostgreSQL with Spring Data JPA
- **Build**: Gradle with Kotlin DSL

### CompanyService

Company and organizational structure management.

**Port**: 8081

**Features**:
- Company CRUD
- Multi-tenant support
- Organizational hierarchy
- Company settings

### NotificationService

Notification delivery system.

**Port**: 8082

**Features**:
- Email notifications
- Push notifications
- Notification templates
- Delivery tracking
- Queue management

### TranslationService

Internationalization service.

**Port**: 8083

**Features**:
- Translation key management
- Multi-language support
- Dynamic translation loading
- Translation export/import

### ScriptingService

Custom business logic execution.

**Port**: 8084

**Features**:
- Script storage and versioning
- Script execution engine
- Sandbox environment
- API integrations

### EdifactService

EDI/EDIFACT document processing.

**Port**: 8085

**Features**:
- EDIFACT message parsing
- Document type support (ORDERS, INVOIC, DESADV)
- Trading partner management
- Message validation
- Conversion mappings

## GraphQL Federation

All services participate in Apollo Federation:

```yaml
# supergraph-config.yaml
subgraphs:
  users:
    routing_url: http://user-service:5000/graphql
    schema:
      subgraph_url: http://user-service:5000/graphql
  shops:
    routing_url: http://shop-service:5003/graphql
    schema:
      subgraph_url: http://shop-service:5003/graphql
  # ...
```

### Federation Entities

Services can extend entities from other services:

```graphql
# UserService
type User @key(fields: "id") {
  id: ID!
  email: String!
  # ...
}

# ShopService (extending User)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

## Database Setup

Each service has its own PostgreSQL database:

| Service | Database | Port |
|---------|----------|------|
| UserService | userdb | 5432 |
| ShopService | shopdb | 5436 |
| AccountingService | accountingdb | 5437 |
| MasterdataService | masterdatadb | 5438 |
| CompanyService | companydb | 5433 |
| NotificationService | notificationdb | 5434 |
| TranslationService | translationdb | 5435 |

## Authentication Flow

1. User sends credentials to UserService
2. UserService validates and issues JWT tokens
3. Client includes access token in Authorization header
4. Gateway passes token to all subgraph requests
5. Each service validates the token

```graphql
mutation {
  login(email: "user@example.com", password: "password") {
    accessToken
    refreshToken
    user { id email }
  }
}
```

## Error Handling

Standardized error responses:

```json
{
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND",
        "serviceName": "UserService"
      }
    }
  ]
}
```

## Health Checks

All services expose health endpoints:

- `.NET`: `/health` (ASP.NET Health Checks)
- `Java`: `/actuator/health` (Spring Actuator)

## Metrics

Prometheus metrics available at:

- `.NET`: `/metrics`
- `Java`: `/actuator/prometheus`
