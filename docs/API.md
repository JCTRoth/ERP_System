# API Reference

## GraphQL Endpoint

**Gateway URL**: `http://localhost:4000/graphql`

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Queries

### Users

```graphql
# Get all users
query GetUsers($first: Int, $after: String) {
  users(first: $first, after: $after) {
    nodes {
      id
      email
      firstName
      lastName
      preferredLanguage
      createdAt
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Get user by ID
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    firstName
    lastName
    preferredLanguage
  }
}

# Get current user
query Me {
  me {
    id
    email
    firstName
    lastName
    preferredLanguage
  }
}
```

### Companies

```graphql
# Get all companies
query GetCompanies($first: Int) {
  companies(first: $first) {
    nodes {
      id
      name
      code
      isActive
      createdAt
    }
  }
}

# Get company by ID
query GetCompany($id: ID!) {
  company(id: $id) {
    id
    name
    code
    address
    settings
  }
}
```

### Products

```graphql
# Get products with filters
query GetProducts(
  $first: Int
  $where: ProductFilterInput
  $order: [ProductSortInput!]
) {
  products(first: $first, where: $where, order: $order) {
    nodes {
      id
      sku
      name
      description
      price
      stockQuantity
      isActive
      category {
        id
        name
      }
      brand {
        id
        name
      }
    }
    totalCount
  }
}

# Get product by ID
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    sku
    name
    description
    price
    costPrice
    stockQuantity
    images
    category {
      id
      name
    }
  }
}
```

### Orders

```graphql
# Get orders
query GetOrders($first: Int, $where: OrderFilterInput) {
  orders(first: $first, where: $where) {
    nodes {
      id
      orderNumber
      status
      totalAmount
      customer {
        id
        firstName
        lastName
      }
      items {
        product {
          name
        }
        quantity
        unitPrice
      }
      createdAt
    }
  }
}

# Get order by ID
query GetOrder($id: ID!) {
  order(id: $id) {
    id
    orderNumber
    status
    subtotal
    taxAmount
    totalAmount
    shippingAddress
    billingAddress
    items {
      id
      product {
        id
        name
        sku
      }
      quantity
      unitPrice
      totalPrice
    }
    payments {
      id
      amount
      method
      status
    }
  }
}
```

### Accounting

```graphql
# Get accounts (Chart of Accounts)
query GetAccounts($where: AccountFilterInput) {
  accounts(where: $where) {
    nodes {
      id
      accountNumber
      name
      type
      balance
      isActive
    }
  }
}

# Get invoices
query GetInvoices($first: Int, $where: InvoiceFilterInput) {
  invoices(first: $first, where: $where) {
    nodes {
      id
      invoiceNumber
      type
      status
      totalAmount
      dueDate
    }
  }
}

# Get financial reports
query BalanceSheet($asOfDate: DateTime!) {
  balanceSheet(asOfDate: $asOfDate) {
    assets {
      name
      balance
    }
    liabilities {
      name
      balance
    }
    equity {
      name
      balance
    }
    totalAssets
    totalLiabilities
    totalEquity
  }
}
```

### Masterdata

```graphql
# Get customers
query GetCustomers($first: Int, $where: CustomerFilterInput) {
  customers(first: $first, where: $where) {
    nodes {
      id
      customerNumber
      name
      email
      phone
      creditLimit
      status
    }
  }
}

# Get employees
query GetEmployees($first: Int, $where: EmployeeFilterInput) {
  employees(first: $first, where: $where) {
    nodes {
      id
      employeeNumber
      firstName
      lastName
      email
      jobTitle
      department {
        name
      }
    }
  }
}
```

## Mutations

### Authentication

```graphql
# Login
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    user {
      id
      email
    }
    accessToken
    refreshToken
  }
}

# Refresh token
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    accessToken
    refreshToken
  }
}

# Logout
mutation Logout($refreshToken: String!) {
  logout(refreshToken: $refreshToken)
}

# Request password reset
mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email) {
    success
    message
  }
}

# Reset password
mutation ResetPassword($token: String!, $password: String!) {
  resetPassword(token: $token, password: $password) {
    success
    message
  }
}
```

### Users

```graphql
# Create user
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    firstName
    lastName
  }
}

# Update user
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    firstName
    lastName
  }
}

# Delete user
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id)
}
```

### Products

```graphql
# Create product
mutation CreateProduct($input: CreateProductInput!) {
  createProduct(input: $input) {
    id
    sku
    name
    price
  }
}

# Update product
mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
  updateProduct(id: $id, input: $input) {
    id
    name
    price
    stockQuantity
  }
}

# Delete product
mutation DeleteProduct($id: ID!) {
  deleteProduct(id: $id)
}
```

### Orders

```graphql
# Create order
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    id
    orderNumber
    status
    totalAmount
  }
}

# Update order status
mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
  updateOrderStatus(id: $id, status: $status) {
    id
    status
  }
}

# Cancel order
mutation CancelOrder($id: ID!, $reason: String) {
  cancelOrder(id: $id, reason: $reason) {
    id
    status
  }
}
```

### Accounting

```graphql
# Create invoice
mutation CreateInvoice($input: CreateInvoiceInput!) {
  createInvoice(input: $input) {
    id
    invoiceNumber
    totalAmount
  }
}

# Create journal entry
mutation CreateJournalEntry($input: CreateJournalEntryInput!) {
  createJournalEntry(input: $input) {
    id
    entryNumber
    description
  }
}

# Record payment
mutation RecordPayment($input: RecordPaymentInput!) {
  recordPayment(input: $input) {
    id
    amount
    status
  }
}
```

## Subscriptions

```graphql
# Order updates
subscription OnOrderUpdated {
  orderUpdated {
    id
    status
    updatedAt
  }
}

# New notifications
subscription OnNotification {
  notificationReceived {
    id
    type
    message
    createdAt
  }
}
```

## Input Types

### CreateUserInput

```graphql
input CreateUserInput {
  email: String!
  password: String!
  firstName: String!
  lastName: String!
  preferredLanguage: String
}
```

### CreateProductInput

```graphql
input CreateProductInput {
  sku: String!
  name: String!
  description: String
  price: Decimal!
  costPrice: Decimal
  categoryId: ID
  brandId: ID
  images: [String!]
}
```

### CreateOrderInput

```graphql
input CreateOrderInput {
  customerId: ID!
  items: [OrderItemInput!]!
  shippingAddress: AddressInput!
  billingAddress: AddressInput
  notes: String
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

input AddressInput {
  street: String!
  city: String!
  state: String
  postalCode: String!
  country: String!
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input data |
| `CONFLICT` | Resource already exists |
| `INTERNAL_ERROR` | Server error |
