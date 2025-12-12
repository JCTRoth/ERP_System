# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Backend Services
- **ShopService** (.NET) - Complete e-commerce module
  - Product catalog management with categories and brands
  - Customer and supplier management
  - Order processing with status tracking
  - Shopping cart functionality
  - Inventory tracking with stock movements
  - Coupon and discount system
  - Shipping methods and rates
  - Payment processing integration

- **AccountingService** (.NET) - Full accounting module
  - Chart of accounts (double-entry bookkeeping)
  - Invoice management (AR/AP)
  - Journal entries
  - Payment records
  - Bank account reconciliation
  - Tax rate management
  - Fiscal period tracking
  - Financial reports (Balance Sheet, Income Statement)

- **MasterdataService** (.NET) - Master data management
  - Customer master data
  - Supplier master data
  - Employee management
  - Department/Cost center structure
  - Location management
  - Asset tracking
  - Reference data (currencies, payment terms, UoM)

- **CompanyService** (Java) - Multi-tenant company management
- **NotificationService** (Java) - Email and push notifications
- **TranslationService** (Java) - Internationalization support
- **ScriptingService** (Java) - Custom business logic execution
- **EdifactService** (Java) - EDI document processing

#### Frontend
- **Products Module** - Full product catalog management
- **Orders Module** - Order listing with status filtering
- **Accounting Module** - Chart of accounts and journal entries
- **Masterdata Module** - Comprehensive master data tabs
  - Customers tab with credit limits
  - Suppliers tab with ratings
  - Employees tab with department view
  - Assets tab with depreciation tracking
  - Reference data tab (currencies, payment terms, UoM)

- **UI Builder** - Visual page builder
  - Drag-and-drop interface
  - Component palette with categories
  - Properties panel for customization
  - Page management (save, load, duplicate)
  - Code export (React components, JSON schema)
  - Live preview functionality

- **Authentication Flow**
  - JWT-based authentication
  - Token refresh mechanism
  - Password reset functionality
  - Forgot password flow

#### Testing
- Vitest configuration for frontend testing
- Test utilities with provider mocks
- Example test suites for auth, store, utilities
- xUnit test project for .NET services
- UserService and PasswordHasher test coverage

#### Documentation
- Comprehensive README.md
- Frontend architecture documentation
- Backend services documentation
- API reference with GraphQL examples
- Contributing guidelines

#### DevOps
- GitHub Actions CI/CD pipeline
  - Multi-service build and test
  - Docker image building
  - Kubernetes deployment
- CodeQL security analysis
- Dependency review workflow
- Docker Compose for development
- Frontend Dockerfile (production and development)
- Nginx configuration for SPA routing

### Changed
- Updated Sidebar navigation with new modules
- Enhanced App.tsx routing configuration
- Improved authentication store with token refresh

### Security
- JWT token validation across all services
- Password hashing with secure algorithms
- Input validation on all GraphQL mutations

## [0.1.0] - Initial Release

### Added
- Initial project structure
- UserService with basic authentication
- Company management
- Frontend scaffolding with React + Vite
- Apollo Gateway federation setup
- Docker Compose for development
- Helm charts for Kubernetes deployment
