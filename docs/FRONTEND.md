# Frontend Architecture

## Overview

The frontend application is built with React 18 and TypeScript, using Vite as the build tool.

## Technology Stack

- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation build tool
- **TailwindCSS** - Utility-first CSS framework
- **Apollo Client** - GraphQL client
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **@dnd-kit** - Drag-and-drop functionality
- **Heroicons** - Icon library

## Project Structure

```
apps/frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── layouts/           # Page layouts
│   │   ├── AuthLayout.tsx
│   │   └── MainLayout.tsx
│   │
│   ├── lib/               # Utility libraries
│   │   └── apollo.ts      # Apollo Client setup
│   │
│   ├── pages/             # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── auth/          # Authentication pages
│   │   ├── companies/     # Company management
│   │   ├── users/         # User management
│   │   ├── products/      # Product catalog
│   │   ├── orders/        # Order management
│   │   ├── accounting/    # Accounting module
│   │   ├── masterdata/    # Master data
│   │   ├── translations/  # Translation management
│   │   ├── settings/      # Application settings
│   │   └── ui-builder/    # Visual UI builder
│   │
│   ├── providers/         # React context providers
│   │   └── I18nProvider.tsx
│   │
│   ├── services/          # API services
│   │   └── authService.ts
│   │
│   ├── stores/            # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── uiBuilderStore.ts
│   │
│   ├── styles/            # Global styles
│   │   └── index.css
│   │
│   ├── test/              # Test utilities
│   │   ├── setup.ts
│   │   └── utils.tsx
│   │
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
│
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Key Features

### Authentication

The application uses JWT-based authentication with:
- Access token (short-lived)
- Refresh token (long-lived)
- Automatic token refresh
- Protected routes

```typescript
// stores/authStore.ts
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      // ...
    }),
    { name: 'erp-auth' }
  )
);
```

### Internationalization

Multi-language support with dynamic loading:

```typescript
// Using translations
const { t } = useI18n();
<h1>{t('dashboard.title')}</h1>
```

### State Management

Zustand for lightweight, scalable state:

```typescript
// Using stores
const user = useAuthStore((state) => state.user);
const sidebarOpen = useUIStore((state) => state.sidebarOpen);
```

### GraphQL Integration

Apollo Client for GraphQL operations:

```typescript
const { data, loading } = useQuery(GET_PRODUCTS);
const [createProduct] = useMutation(CREATE_PRODUCT);
```

## UI Components

### Common Patterns

```typescript
// Page structure
export default function ProductsPage() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div>
      <PageHeader title={t('products.title')} />
      <DataTable data={products} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
```

### Styling

TailwindCSS with custom design tokens:

```css
/* styles/index.css */
@layer base {
  :root {
    --color-primary: 59 130 246;
    --color-sidebar: 30 41 59;
  }
}
```

## UI Builder

The visual UI builder allows creating custom pages:

- Drag-and-drop interface
- Component palette with categories
- Properties panel for customization
- Code export (React/JSON)
- Page management

## Testing

Using Vitest with React Testing Library:

```typescript
import { render, screen } from '../test/utils';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
```

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Test coverage
npm run test:coverage

# Linting
npm run lint

# Type checking
npm run typecheck
```

## Environment Variables

Create `.env.local` for local development:

```env
VITE_GATEWAY_URL=http://localhost:4000
VITE_APP_TITLE=ERP System
```
