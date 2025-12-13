# Contributing to ERP System

Thank you for your interest in contributing to the ERP System! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

Please be respectful and constructive in all interactions. We are committed to providing a welcoming environment for everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- .NET 8 SDK
- Java 21
- Docker & Docker Compose
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ERP_System.git
   cd ERP_System
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/ERP_System.git
   ```
4. Install dependencies:
   ```bash
   # Root dependencies
   npm install
   
   # Frontend
   cd apps/frontend && npm install
   
   # Gateway
   cd ../gateway && npm install
   ```
5. Start development environment:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes
- `release/*` - Release preparation

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout develop
git merge upstream/develop

# Create feature branch
git checkout -b feature/your-feature-name
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all frontend code
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Prefer named exports over default exports

```typescript
// Good
export function MyComponent() {
  const [state, setState] = useState<string>('');
  return <div>{state}</div>;
}

// Avoid
export default class MyComponent extends React.Component {}
```

### .NET (C#)

- Follow Microsoft C# coding conventions
- Use nullable reference types
- Prefer async/await for I/O operations
- Use dependency injection

```csharp
// Good
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    
    public UserService(IUserRepository repository)
    {
        _repository = repository;
    }
    
    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _repository.GetByIdAsync(id);
    }
}
```

### Java

- Follow Google Java Style Guide
- Use records for DTOs
- Prefer constructor injection
- Use Optional for nullable returns

```java
// Good
@Service
public class CompanyService {
    private final CompanyRepository repository;
    
    public CompanyService(CompanyRepository repository) {
        this.repository = repository;
    }
    
    public Optional<Company> findById(UUID id) {
        return repository.findById(id);
    }
}
```

## Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(shop): add product inventory tracking

- Add StockMovement entity
- Implement inventory adjustment API
- Add low stock notifications

Closes #123
```

```
fix(auth): resolve token refresh race condition

The refresh token endpoint was allowing multiple concurrent
refreshes, causing token invalidation issues.
```

## Pull Request Process

1. **Update your branch** with the latest changes:
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run all tests** locally:
   ```bash
   # Frontend
   cd apps/frontend && npm test
   
   # .NET
   dotnet test
   
   # Java
   ./gradlew test
   ```

3. **Create the PR** against `develop` branch

4. **Fill out the PR template** completely

5. **Address review feedback** promptly

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] No merge conflicts

## Testing Guidelines

### Frontend

- Use Vitest and React Testing Library
- Test user interactions, not implementation
- Aim for 80% coverage on new code

```typescript
import { render, screen, userEvent } from '../test/utils';

describe('ProductForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Product');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Product' })
    );
  });
});
```

### .NET

- Use xUnit with FluentAssertions
- Use Moq for mocking dependencies
- Test service layer logic

```csharp
[Fact]
public async Task CreateUser_WithValidInput_ReturnsUser()
{
    // Arrange
    var input = new CreateUserInput { Email = "test@example.com" };
    
    // Act
    var result = await _service.CreateAsync(input);
    
    // Assert
    result.Should().NotBeNull();
    result.Email.Should().Be("test@example.com");
}
```

### Java

- Use JUnit 5 with AssertJ
- Use Mockito for mocking
- Test GraphQL resolvers

```java
@Test
void findById_existingCompany_returnsCompany() {
    // Given
    var company = new Company();
    company.setId(UUID.randomUUID());
    when(repository.findById(company.getId())).thenReturn(Optional.of(company));
    
    // When
    var result = service.findById(company.getId());
    
    // Then
    assertThat(result).isPresent();
    assertThat(result.get().getId()).isEqualTo(company.getId());
}
```

## Questions?

If you have questions, please:

1. Check existing documentation
2. Search existing issues
3. Open a new issue with the "question" label

Thank you for contributing! 🎉
