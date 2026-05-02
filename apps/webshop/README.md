# Webshop Frontend

This app is the customer-facing storefront for the ERP system.

## Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Apollo Client
- React Router

## Local Development

From repository root:

```bash
cd apps/webshop
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Open:

- `http://localhost:5174`

## API Integration

- The frontend sends GraphQL requests to `/graphql`.
- Vite proxies `/graphql` to:
  - `process.env.GATEWAY_URL` if set, or
  - `http://localhost:4000` by default.

Company context header is attached in Apollo client:

- Header: `X-Company-Id`
- Source: `VITE_COMPANY_ID` env var
- Fallback: demo company id (`ae161374-7185-4aa5-97f4-bcb35cf0ae19`)

## Main User Flows

- Home and featured products
- Catalog and category pages
- Product detail page
- Session-based guest cart
- Checkout and order confirmation

## Useful Checks

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build

# Quick API smoke test through Vite proxy
curl -X POST http://localhost:5174/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Relevant Paths

- `src/pages` for route pages
- `src/components` for reusable UI
- `src/context/CartContext.tsx` for cart state and mutations
- `src/graphql/queries.ts` and `src/graphql/mutations.ts` for operations
- `src/lib/apollo.ts` for Apollo setup and headers
- `vite.config.ts` for GraphQL proxy configuration
