# GitHub Copilot Instructions for ERP System

- Only mix Ghic.io container and local conatiner builds if you really know what you are doing.
- SQL Changes that fix problems must be accompanied extention of the code and by a test that reproduces the problem.
- Always test your changes by using wget/curl against the local running services.
- Always run a build of the sub project you are working on before ending your work, if errors occur fix them before ending your work.

## Project Overview
This is a modern, full-stack Enterprise Resource Planning (ERP) system built with microservices architecture. The system manages business operations including user management, accounting, inventory, orders, and document generation.

## Architecture Guidelines

### Microservices Structure
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Apollo Client
- **Backend Services**:
  - .NET 8 (GraphQL HotChocolate): User, Shop, Accounting, Masterdata services
  - Java Spring Boot 3.2 (Netflix DGS GraphQL): Company, Translation, Notification, Scripting, Edifact services
  - Node.js + Express: Templates service (AsciiDoc-based document generation)
- **Gateway**: Apollo Gateway (GraphQL Federation)
- **Infrastructure**: Docker Compose (dev), Kubernetes + Helm (prod), PostgreSQL per service

### Implementation Guidelines

#### 1. Service Communication
- Use GraphQL for service-to-service communication via Apollo Gateway
- REST APIs only for external integrations (templates service)
- Follow schema-first GraphQL development

#### 2. Database Design
- One PostgreSQL Schema per microservice
- Use Entity Framework Core (.NET) or JPA/Hibernate (Java) for ORM
- Implement proper migrations and seeding

#### 3. Frontend Development
- Use React hooks and functional components
- Implement Apollo Client for GraphQL queries/mutations
- Follow component-based architecture with clear separation of concerns
- Use TypeScript interfaces for all data models
- Define proper types for GraphQL query results instead of using `any` to enable better IDE support and catch errors at compile time

#### 4. Code Quality
- Write comprehensive unit and integration tests
- Follow language-specific best practices (.NET/Java/Node.js)
- Use proper error handling and logging
- Implement proper validation on both client and server

#### 5. Document Generation
- Use AsciiDoc templates for document generation
- Templates support variable substitution from business data
- PDF generation via asciidoctor-pdf
- Templates are assigned to specific document states (confirmed, shipped, etc.)

#### 6. Development Workflow
- Use Docker Compose for local development
- Follow Git flow with feature branches
- Write clear commit messages and PR descriptions
- Test changes across all affected services

## Common Patterns

### Adding a New Feature
1. Identify which microservice(s) need changes
2. Update GraphQL schema if needed
3. Implement backend logic with proper error handling
4. Update frontend components and queries
5. Add/update tests
6. Update documentation

### Database Changes
1. Create migration scripts
2. Update entity models
3. Update GraphQL schemas
4. Test data seeding

### Template Development
1. Create AsciiDoc template with variable placeholders
2. Assign appropriate document type and state
3. Test rendering with sample data
4. Verify PDF generation

## Key Technologies
- **Frontend**: React, TypeScript, Apollo Client, TailwindCSS
- **Backend**: .NET 8, Java 21, Node.js 20
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker, Kubernetes, Helm
- **Communication**: GraphQL Federation, REST
- **Documentation**: AsciiDoc, PDF generation</content>

## Scripts Folder

- Location: `scripts/` with subfolders by purpose: `scripts/dev/` (start/stop), `scripts/build/` (build images), `scripts/k3s/` (K3s deployment), `scripts/test/` (integration tests), `scripts/translation/` (i18n utilities), `scripts/setup/` (dev machine setup), `scripts/deployment/` (GHCR & production deploy), `scripts/document_test_utils/` (document/template utilities).
- Purpose: centralize developer and CI helper scripts for building, pushing images, running local integration tests, and environment setup.
- Usage:
  - Read the script header comment or the subfolder README for usage and options before running.
  - Run scripts from the repository root to ensure relative paths resolve correctly.
  - Prefer the `--dry-run` option when available before executing destructive operations.
- CI / Registry:
  - Use `scripts/deployment/deploy-to-registry.sh` to build and push images to GHCR; provide credentials via env vars or a config file.
  - If running on a local k3s cluster, prefer importing images into k3s (`k3s ctr images import`) or use a private registry and set `global.imageRegistry` in Helm values.
- Safety and testing:
  - Always run the provided test scripts (e.g., `scripts/test/*`) or `scripts/test/test-all-services.sh` after deployment to verify health.
  - Database-changing scripts must include an automated test reproducing the fixed issue (see SQL Changes rule above).
- Contribute:
  - When adding or modifying scripts, update this file and add usage examples and a minimal test to `test-logs/` where appropriate.

<parameter name="filePath">/home/jonas/Git/ERP_System/.github/copilot-instructions.md