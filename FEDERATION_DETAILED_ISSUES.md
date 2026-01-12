# Federation Issues - Detailed Analysis

## Current Status

Gateway is attempting to compose the supergraph but encountering several Federation v2 compatibility issues.

## Identified Issues

### 1. Order and OrderItem Fields Not Shareable

**Error:**
```
Non-shareable field "Order.id" is resolved from multiple subgraphs: 
it is resolved from subgraphs "orders-service" and "shop-service" 
and defined as non-shareable in subgraph "orders-service"
```

**Root Cause:**
Both `orders-service` and `shop-service` define Order and OrderItem types. While both call `descriptor.Shareable()` on the type, the individual fields are not being marked as shareable in the generated Fed v2 schema.

**Affected Fields:**
- Order: id, orderNumber, customerId, status, createdAt, updatedAt, items
- OrderItem: id, orderId, productId, quantity, unitPrice

**Solution Options:**

**Option A - Make Fields Explicitly Shareable (Recommended)**

In both OrdersService and ShopService `GraphQL/Types.cs`, mark each shared field as shareable:

```csharp
public class OrderObjectType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        descriptor.Shareable();
        descriptor.Key("id");
        
        // Explicitly mark each field as shareable
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(o => o.OrderNumber).Type<NonNullType<StringType>>().Shareable();
        descriptor.Field(o => o.CustomerId).Type<NonNullType<IdType>>().Shareable();
        descriptor.Field(o => o.Status).Type<NonNullType<EnumType<OrderStatus>>>().Shareable();
        descriptor.Field(o => o.CreatedAt).Type<NonNullType<DateTimeType>>().Shareable();
        descriptor.Field(o => o.UpdatedAt).Type<NonNullType<DateTimeType>>().Shareable();
        descriptor.Field(o => o.Items).Shareable()
            .ResolveWith<OrderResolvers>(r => r.GetItems(default!, default!));
    }
}
```

Apply the same pattern to OrderItemObjectType in both services.

**Option B - Use Entity Stubs (Cleaner Architecture)**

Make shop-service use entity stubs for Order/OrderItem (similar to what we did with User):

```csharp
public class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        descriptor.Key("id");
        descriptor.ExtendServiceType();  // This is an extension
        
        descriptor.Field(o => o.Id).Type<NonNullType<IdType>>();
        
        // Shop-service specific fields only
        descriptor.Field(o => o.PaymentInfo).Type<PaymentInfoType>();
        descriptor.Field(o => o.ShippingInfo).Type<ShippingInfoType>();
    }
}
```

This approach treats orders-service as the source of truth for Order data.

### 2. User.id Still Not Shareable

**Error:**
```
Non-shareable field "User.id" is resolved from multiple subgraphs: 
it is resolved from subgraphs "shop-service" and "user-service" 
and defined as non-shareable in subgraph "user-service"
```

**Root Cause:**
The shop-service has been updated to use User stub with `ExtendServiceType()`, but:
1. The updated shop-service image hasn't been deployed/restarted
2. User-service might also need fields marked as shareable

**Solution:**
1. Rebuild shop-service image (already done locally)
2. Restart shop-service container with new image
3. Verify user-service User type marks fields as shareable:

```csharp
// In UserService/GraphQL/UserType.cs
descriptor.Field(u => u.Id).Type<NonNullType<IdType>>().Shareable();
descriptor.Field(u => u.Email).Type<NonNullType<StringType>>().Shareable();
// ... mark all fields as shareable
```

### 3. Enum Value Normalization Issues

**Errors:**
```
Enum type "PaymentMethod"... value "INVOICE" is not defined in all subgraphs
Enum type "OrderStatus"... value "PROCESSING" not defined in all subgraphs
```

**Root Cause:**
GraphQL normalizes enum values to UPPER_SNAKE_CASE. The C# enums use PascalCase:
- C#: `Invoice` → GraphQL: `INVOICE`
- C#: `Processing` → GraphQL: `PROCESSING`

The actual enum definitions are identical, but there might be a casing configuration difference between services.

**Current Enums:**
```csharp
// PaymentMethod (both services - IDENTICAL)
BankTransfer, CreditCard, DebitCard, Cash, Check, PayPal, DirectDebit, Invoice, Other

// OrderStatus (both services - IDENTICAL)  
Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded, OnHold
```

**Solution:**
Check HotChocolate configuration for enum naming conventions. Ensure both services use the same naming strategy:

```csharp
// In Program.cs
services.AddGraphQLServer()
    .AddApolloFederation()
    .AddConvention<INamingConventions, DefaultNamingConventions>()
    // OR specify explicit enum naming
    .ModifyOptions(opt => {
        opt.UseXmlDocumentation = true;
        opt.DefaultBindingBehavior = BindingBehavior.Explicit;
    });
```

## Required Actions

### Immediate (To Fix Gateway)

1. **Update Order/OrderItem Types:**
   - [ ] Add `.Shareable()` to each field in OrdersService/GraphQL/Types.cs
   - [ ] Add `.Shareable()` to each field in ShopService/GraphQL/Types.cs
   - [ ] Rebuild both services
   
2. **Update User Type:**
   - [ ] Add `.Shareable()` to fields in UserService/GraphQL/UserType.cs
   - [ ] Rebuild user-service
   - [ ] Restart shop-service with updated image

3. **Fix Enum Casing:**
   - [ ] Review HotChocolate configuration in all .NET services
   - [ ] Ensure consistent enum naming strategy
   - [ ] Rebuild affected services

### Testing Commands

After fixes are applied:

```bash
# Rebuild services
cd /home/jonas/Git/ERP_System

docker build -f apps/services/dotnet/OrdersService/Dockerfile \
  -t ghcr.io/jctroth/erp-orders-service:latest \
  apps/services/dotnet/OrdersService

docker build -f apps/services/dotnet/ShopService/Dockerfile \
  -t ghcr.io/jctroth/erp-shop-service:latest \
  apps/services/dotnet/ShopService

docker build -f apps/services/dotnet/UserService/Dockerfile \
  -t ghcr.io/jctroth/erp-user-service:latest \
  apps/services/dotnet/UserService

# Restart services
docker stop erp-gateway erp-orders-service erp-shop-service erp-user-service
docker rm erp-gateway

docker compose up -d orders-service shop-service user-service

# Start gateway
docker run -d --name erp-gateway \
  --network erp_system_backend \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e USER_SERVICE_URL=http://user-service:5000/graphql \
  -e SHOP_SERVICE_URL=http://shop-service:5003/graphql \
  -e ACCOUNTING_SERVICE_URL=http://accounting-service:5001/graphql \
  -e MASTERDATA_SERVICE_URL=http://masterdata-service:5002/graphql \
  -e ORDERS_SERVICE_URL=http://orders-service:5004/graphql \
  test-gateway:latest

# Check gateway logs
docker logs erp-gateway

# Test gateway
curl http://localhost:4000/health
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__schema{queryType{name}}}"}'
```

## HotChocolate Federation Configuration Reference

Ensure all .NET services have this in Program.cs:

```csharp
builder.Services
    .AddGraphQLServer()
    .AddApolloFederation()  // Enable Federation v2
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<UserType>()  // Register custom types
    .AddType<OrderType>()
    .AddType<OrderItemType>()
    .AddFiltering()
    .AddSorting()
    .AddProjections();
```

For shareable types, the pattern is:

```csharp
public class YourType : ObjectType<YourModel>
{
    protected override void Configure(IObjectTypeDescriptor<YourModel> descriptor)
    {
        descriptor.Shareable();  // Type-level
        descriptor.Key("id");     // Federation key
        
        // Each field that's shared across services
        descriptor.Field(x => x.Id).Shareable();
        descriptor.Field(x => x.Name).Shareable();
        // etc.
    }
}
```

## Files to Modify

1. `/apps/services/dotnet/OrdersService/GraphQL/Types.cs`
   - Lines 9-29 (OrderObjectType)
   - Lines 33-47 (OrderItemObjectType)

2. `/apps/services/dotnet/ShopService/GraphQL/Types.cs`
   - Lines 161-189 (OrderItemType)
   - Lines 201-240 (OrderType)

3. `/apps/services/dotnet/UserService/GraphQL/UserType.cs`
   - Lines 11-43 (UserType fields)

## Expected Outcome

After applying these fixes:
- Gateway should successfully compose the supergraph
- No "non-shareable field" errors
- All enum values properly normalized
- Federation queries work across services

## Validation

Run the test script to verify:
```bash
./scripts/test-docker-network.sh
```

Expected: All tests pass, gateway operational, cross-service queries functional.
