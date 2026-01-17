import { gql } from '@apollo/client';

// GraphQL queries for master data
export const GET_ORDERS = gql`
  query GetOrdersForTemplate {
    shopOrders(first: 50) {
      nodes {
        id
        orderNumber
        status
      }
    }
  }
`;

export const GET_INVOICES = gql`
  query GetInvoicesForTemplate {
    invoices(first: 50) {
      nodes {
        id
        invoiceNumber
        status
      }
    }
  }
`;

export const GET_CUSTOMERS = gql`
  query GetCustomersForTemplate {
    customers(first: 50) {
      nodes {
        id
        name
        customerNumber
      }
    }
  }
`;

export const GET_PRODUCTS = gql`
  query GetProductsForTemplate {
    products(first: 50) {
      nodes {
        id
        name
        sku
      }
    }
  }
`;

export const GET_COMPANIES = gql`
  query GetCompaniesForTemplate {
    companies {
      id
      name
      slug
    }
  }
`;

// Detail queries for fetching full records
export const GET_ORDER_DETAILS = gql`
  query GetOrderDetails($id: UUID!) {
    shopOrder(id: $id) {
      id
      orderNumber
      subtotal
      taxAmount
      shippingAmount
      discountAmount
      total
      notes
      items {
        id
        productId
        productName
        sku
        quantity
        unitPrice
        discount
        taxAmount
        total
      }
      shippingAddress { name street city postalCode country phone }
      billingAddress { name street city postalCode country }
      createdAt
    }
  }
`;

// Shop service version - uses UUID instead of String
export const GET_SHOP_ORDER_DETAILS = gql`
  query GetShopOrderDetails($id: UUID!) {
    shopOrder(id: $id) {
      id
      orderNumber
      subtotal
      taxAmount
      shippingAmount
      discountAmount
      total
      notes
      items {
        id
        productId
        productName
        sku
        quantity
        unitPrice
        discount
        taxAmount
        total
      }
      shippingAddress { name street city postalCode country phone }
      billingAddress { name street city postalCode country }
      createdAt
    }
  }
`;

export const GET_INVOICE_DETAILS = gql`
  query GetInvoiceDetails($id: UUID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      type
      status
      customerId
      customerName
      billingAddress
      billingCity
      billingPostalCode
      billingCountry
      vatNumber
      issueDate
      invoiceDate
      dueDate
      subtotal
      taxAmount
      taxRate
      discountAmount
      total
      currency
      notes
      paymentTerms
      lineItems { description sku quantity unitPrice discountAmount total lineNumber }
    }
  }
`;

export const GET_CUSTOMER_DETAILS = gql`
  query GetCustomerDetails($customerNumber: String!) {
    customerByNumber(customerNumber: $customerNumber) {
      id
      name
      email
      defaultAddress { name street city postalCode country phone }
      addresses { name street city postalCode country phone }
    }
  }
`;

export const GET_COMPANY_DETAILS = gql`
  query GetCompanyDetails($id: ID!) {
    company(id: $id) {
      id
      name
      slug
      description
      logoUrl
    }
  }
`;

export const GET_PRODUCT_DETAILS = gql`
  query GetProductDetails($id: UUID!) {
    product(id: $id) {
      id
      name
      sku
      price
      description
    }
  }
`;

// Types for template context
export interface TemplateContext {
  company?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: {
      street?: string | null;
      city?: string | null;
      postalCode?: string | null;
      country?: string | null;
    };
  };
  shipment?: {
    number?: string | null;
    date?: string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
    notes?: string | null;
  };
  shipping?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
  };
  invoice?: {
    id: string;
    number?: string | null;
    date?: string | null;
    dueDate?: string | null;
    subtotal?: number | null;
    taxRate?: number | null;
    tax?: number | null;
    shipping?: number | null;
    discount?: number | null;
    total?: number | null;
    notes?: string | null;
    currency?: string | null;
    paymentTerms?: string | null;
  };
  order?: any;
  items?: Array<{
    index: number;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    discount?: number | null;
    total?: number | null;
  }>;
  product?: any;
  orderItems?: Array<{
    index: number;
    name?: string | null;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    total?: number | null;
  }>;
  products?: Array<{
    index: number;
    name?: string | null;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    total?: number | null;
  }>;
  productList?: Array<{
    index: number;
    name?: string | null;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    total?: number | null;
  }>;
  cancellation?: {
    date: string;
    reason: string;
    refundAmount: number;
    method: string;
    notes: string;
    items?: Array<{
      index: number;
      name?: string | null;
      description?: string | null;
      quantity?: number | null;
      unitPrice?: number | null;
      total?: number | null;
    }>;
  };
}

// Parse template content to extract used variables
export function extractUsedVariables(templateContent: string): Set<string> {
  const variableRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(templateContent)) !== null) {
    variables.add(match[1]);
  }

  return variables;
}

// Determine required context fields based on used variables
export function getRequiredContextFields(usedVariables: Set<string>): Set<string> {
  const required = new Set<string>();

  for (const variable of usedVariables) {
    const parts = variable.split('.');
    const root = parts[0];

    switch (root) {
      case 'company':
        required.add('company');
        break;
      case 'customer':
        // Customer data can come from invoice billing fields, so only require invoice if using customer variables
        // The invoice's billingAddress/customerName will auto-populate customer context
        if (!required.has('invoice')) {
          required.add('invoice');
        }
        break;
      case 'invoice':
        required.add('invoice');
        break;
      case 'order':
        required.add('order');
        break;
      case 'product':
        required.add('product');
        break;
      case 'items':
      case 'item':
      case 'index':
        // Items/index require either invoice or order
        if (!required.has('invoice') && !required.has('order')) {
          required.add('invoice'); // Default to invoice for items
        }
        break;
    }
  }

  return required;
}

// Build context from selected records and normalize to templates-service shape
export function buildTemplateContext(
  selectedIds: {
    companyId?: string | null;
    customerId?: string | null;
    invoiceId?: string | null;
    orderId?: string | null;
    productId?: string | null;
  },
  masterData: {
    companies: any[];
    customers: any[];
    invoices: any[];
    orders: any[];
    products: any[];
  },
  fullRecords: {
    fullCompany?: any;
    fullCustomer?: any;
    fullInvoice?: any;
    fullOrder?: any;
    fullProduct?: any;
  }
): TemplateContext {
  const context: TemplateContext = {};

  // Company context
  if (selectedIds.companyId) {
    const co = fullRecords.fullCompany || masterData.companies.find((c: any) => String(c.id) === String(selectedIds.companyId));
    if (co) {
      context.company = {
        id: co.id,
        name: co.name,
        email: co.email || co.contactEmail || null,
        phone: co.phone || co.contactPhone || null,
        address: co.address || co.street || null,
        city: co.city || null,
        postalCode: co.postalCode || co.zip || null,
        country: co.country || null,
      };
    }
  }

  // Customer context
  if (selectedIds.customerId) {
    const cu = fullRecords.fullCustomer || masterData.customers.find((c: any) => String(c.id) === String(selectedIds.customerId));
    if (cu) {
      const defaultAddr = cu.defaultAddress || (cu.addresses && cu.addresses[0]) || cu.billing || cu.address || null;
      context.customer = {
        id: cu.id,
        name: cu.name || `${cu.firstName || ''} ${cu.lastName || ''}`.trim(),
        email: cu.email || null,
        phone: cu.phone || cu.contactPhone || cu.mobile || null,
        address: defaultAddr
          ? {
              street: defaultAddr.street || defaultAddr.address || undefined,
              city: defaultAddr.city || undefined,
              postalCode: defaultAddr.postalCode || defaultAddr.zip || undefined,
              country: defaultAddr.country || undefined,
            }
          : undefined,
      };
    }
  }

  // Invoice context
  if (selectedIds.invoiceId) {
    const inv = fullRecords.fullInvoice || masterData.invoices.find((i: any) => String(i.id) === String(selectedIds.invoiceId));
    if (inv) {
      context.invoice = {
        id: inv.id,
        number: inv.invoiceNumber || inv.number || null,
        date: inv.issueDate || inv.invoiceDate || inv.date || inv.createdAt || null,
        dueDate: inv.dueDate || null,
        subtotal: inv.subtotal ?? inv.Subtotal ?? inv.amountBeforeTax ?? null,
        taxRate: inv.taxRate ?? inv.TaxRate ?? null,
        tax: inv.taxAmount ?? inv.TaxAmount ?? inv.tax ?? null,
        shipping: inv.shipping ?? null,
        discount: inv.discount ?? inv.discountAmount ?? null,
        total: inv.total ?? inv.Total ?? inv.amount ?? null,
        currency: inv.currency || null,
        notes: inv.notes || inv.Notes || null,
        paymentTerms: inv.paymentTerms || null,
      };

      // Auto-populate customer context from invoice billing data (no need to select customer separately)
      if (!context.customer && (inv.customerName || inv.billingAddress)) {
        context.customer = {
          id: inv.customerId || '',
          name: inv.customerName || null,
          email: null,
          phone: inv.customerPhone || inv.billingPhone || null,
          address: {
            street: inv.billingAddress || undefined,
            city: inv.billingCity || undefined,
            postalCode: inv.billingPostalCode || undefined,
            country: inv.billingCountry || undefined,
          },
        };
      }

      // Map line items to items array
      if (Array.isArray((inv as any).lineItems) && (inv as any).lineItems.length > 0) {
        context.items = (inv as any).lineItems.map((it: any, idx: number) => ({
          index: it.lineNumber ?? it.index ?? idx + 1,
          description: it.description || it.name || null,
          quantity: it.quantity ?? it.Quantity ?? null,
          unitPrice: it.unitPrice ?? it.UnitPrice ?? it.price ?? null,
          discount: it.discountAmount ?? it.discount ?? 0,
          total: it.total ?? it.Total ?? null,
          sku: it.sku || it.SKU || it.productSku || null,
        }));
      }
    }
  }

  // Order context
  if (selectedIds.orderId) {
    const o = fullRecords.fullOrder || masterData.orders.find((ord: any) => String(ord.id) === String(selectedIds.orderId));
    if (o) {
      // Create a copy of the order with additional template-compatible fields
      context.order = {
        ...o,
        // Add 'number' alias for templates that expect order.number instead of order.orderNumber
        number: o.orderNumber,
      };

      // Map order fields to invoice-like structure if no invoice selected
      if (!context.invoice) {
        context.invoice = {
          id: o.id,
          number: o.orderNumber || null,
          date: o.createdAt || null,
          subtotal: o.subtotal ?? o.Subtotal ?? null,
          tax: o.taxAmount ?? o.TaxAmount ?? null,
          shipping: o.shippingAmount ?? o.ShippingAmount ?? null,
          discount: o.discountAmount ?? o.DiscountAmount ?? null,
          total: o.total ?? o.Total ?? null,
        };
      }

      // Map items if not already set by invoice
      if (!context.items && Array.isArray((o as any).items) && (o as any).items.length > 0) {
        context.items = (o as any).items.map((it: any, idx: number) => ({
          index: it.index ?? idx + 1,
          // Add 'name' alias for templates that expect item.name
          name: it.productName || it.name || it.description || null,
          description: it.description || it.name || it.productName || null,
          quantity: it.quantity ?? it.Quantity ?? null,
          unitPrice: it.unitPrice ?? it.UnitPrice ?? it.price ?? null,
          discount: it.discount ?? it.DiscountAmount ?? 0,
          total: it.total ?? it.Total ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : null),
          sku: it.sku || it.SKU || it.productSku || null,
        }));
      }

      // Auto-populate customer context from order customer data if not already set
      if (!context.customer && o.customer) {
        // Build customer name from available fields
        const customerName = 
          o.customer.name ||
          `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() ||
          o.customer.email ||
          `Customer ${o.customer.id?.toString().slice(0, 8) || 'Unknown'}`;

        context.customer = {
          id: o.customer.id || o.customerId || '',
          name: customerName,
          email: o.customer.email || null,
          phone: o.customer.phone || o.customer.contactPhone || o.customer.mobile || null,
          address: o.customer.address || {
            street: o.shippingAddress?.street || o.billingAddress?.street || undefined,
            city: o.shippingAddress?.city || o.billingAddress?.city || undefined,
            postalCode: o.shippingAddress?.postalCode || o.billingAddress?.postalCode || undefined,
            country: o.shippingAddress?.country || o.billingAddress?.country || undefined,
          },
        };
      }
    }
  }

  // Shipment context (mock data for preview when order is selected)
  if (selectedIds.orderId && !context.shipment) {
    const o = fullRecords.fullOrder || masterData.orders.find((ord: any) => String(ord.id) === String(selectedIds.orderId));
    if (o) {
      context.shipment = {
        number: `SHIP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0], // Current date
        carrier: 'DHL Express', // Default carrier
        trackingNumber: `TRACK${Math.floor(100000000 + Math.random() * 900000000)}`, // Random tracking number
        notes: 'Preview shipment information. Actual tracking will be provided when shipped.',
      };
    }
  }

  // Shipping address context (from order shipping address)
  if (selectedIds.orderId && !context.shipping) {
    const o = fullRecords.fullOrder || masterData.orders.find((ord: any) => String(ord.id) === String(selectedIds.orderId));
    if (o && o.shippingAddress) {
      context.shipping = {
        name: o.shippingAddress.name || o.customer?.name || null,
        street: o.shippingAddress.street || null,
        city: o.shippingAddress.city || null,
        postalCode: o.shippingAddress.postalCode || o.shippingAddress.zip || null,
        country: o.shippingAddress.country || null,
        phone: o.shippingAddress.phone || o.customer?.phone || null,
      };
    }
  }

  // Cancellation context (mock data for preview when order is selected)
  if (selectedIds.orderId && !context.cancellation) {
    const o = fullRecords.fullOrder || masterData.orders.find((ord: any) => String(ord.id) === String(selectedIds.orderId));
    if (o) {
      context.cancellation = {
        date: new Date().toISOString(), // Current date as cancellation date
        reason: 'Customer requested cancellation', // Default reason
        refundAmount: o.total ?? o.Total ?? 0, // Full refund by default
        method: 'Original payment method', // Default method
        notes: 'This is a preview cancellation. Actual cancellation would be processed through the system.',
      };

      // Add items from the order to cancellation context
      const orderItems = o.items || o.orderItems || o.lineItems || o.products || [];
      if (Array.isArray(orderItems) && orderItems.length > 0) {
        console.log('DEBUG: Processing order items for cancellation:', orderItems);
        const cancellationItems = orderItems.map((item: any, index: number) => ({
          index: index + 1,
          name: item.productName || item.name || item.description || item.product || 'Product',
          description: item.description || item.name || item.productName || item.product || null,
          sku: item.sku || item.SKU || item.productSku || null,
          quantity: item.quantity ?? item.Quantity ?? item.qty ?? 1,
          unitPrice: item.unitPrice ?? item.UnitPrice ?? item.price ?? item.amount ?? 0,
          total: item.total ?? item.Total ?? item.subtotal ?? ((item.quantity ?? 1) * (item.unitPrice ?? 0)),
        }));
        console.log('DEBUG: Created cancellation items:', cancellationItems);
        context.cancellation.items = cancellationItems;
        // Also set items at root level for backward compatibility with templates
        context.items = cancellationItems;
        // Try some common alternative variable names
        context.orderItems = cancellationItems;
        context.products = cancellationItems;
        context.productList = cancellationItems;
        // Ensure order.items is populated (critical for templates using {#order.items})
        if (!context.order) context.order = {} as any;
        (context.order as any).items = cancellationItems;
      } else {
        console.log('DEBUG: No items found in order for cancellation:', o);
      }
    }
  }

  // Product context
  if (selectedIds.productId) {
    const p = masterData.products.find((pr: any) => String(pr.id) === String(selectedIds.productId));
    if (p) {
      context.product = p;
    }
  }

  return context;
}