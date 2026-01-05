import { gql } from '@apollo/client';

// GraphQL queries for master data
export const GET_ORDERS = gql`
  query GetOrdersForTemplate {
    orders(first: 50) {
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
  query GetOrderDetails($id: ID!) {
    order(id: $id) {
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
  query GetInvoiceDetails($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      issueDate
      invoiceDate
      subtotal
      taxAmount
      taxRate
      discountAmount
      total
      notes
      lineItems { description sku quantity unitPrice discountAmount total lineNumber }
    }
  }
`;

export const GET_CUSTOMER_DETAILS = gql`
  query GetCustomerDetails($id: ID!) {
    customer(id: $id) {
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
      email
      phone
    }
  }
`;

export const GET_PRODUCT_DETAILS = gql`
  query GetProductDetails($id: ID!) {
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
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  invoice?: {
    id: string;
    number?: string;
    date?: string;
    subtotal?: number;
    taxRate?: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    total?: number;
    notes?: string;
  };
  order?: any;
  items?: Array<{
    index: number;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    total?: number;
  }>;
  product?: any;
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
        required.add('customer');
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
        // Items require either invoice or order
        if (usedVariables.has('invoice') || usedVariables.has('order')) {
          // Already covered
        } else {
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
        subtotal: inv.subtotal ?? inv.Subtotal ?? inv.amountBeforeTax ?? null,
        taxRate: inv.taxRate ?? inv.TaxRate ?? null,
        tax: inv.taxAmount ?? inv.TaxAmount ?? inv.tax ?? null,
        shipping: inv.shipping ?? null,
        discount: inv.discount ?? inv.discountAmount ?? null,
        total: inv.total ?? inv.Total ?? inv.amount ?? null,
        notes: inv.notes || inv.Notes || null,
      };

      // Map line items to items array
      if (Array.isArray((inv as any).lineItems) && (inv as any).lineItems.length > 0) {
        context.items = (inv as any).lineItems.map((it: any, idx: number) => ({
          index: it.lineNumber ?? it.index ?? idx + 1,
          description: it.description || it.name || null,
          quantity: it.quantity ?? it.Quantity ?? null,
          unitPrice: it.unitPrice ?? it.UnitPrice ?? it.price ?? null,
          discount: it.discountAmount ?? it.discount ?? 0,
          total: it.total ?? it.Total ?? null,
        }));
      }
    }
  }

  // Order context
  if (selectedIds.orderId) {
    const o = fullRecords.fullOrder || masterData.orders.find((ord: any) => String(ord.id) === String(selectedIds.orderId));
    if (o) {
      context.order = o;

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
          description: it.description || it.name || it.productName || null,
          quantity: it.quantity ?? it.Quantity ?? null,
          unitPrice: it.unitPrice ?? it.UnitPrice ?? it.price ?? null,
          discount: it.discount ?? it.DiscountAmount ?? 0,
          total: it.total ?? it.Total ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : null),
        }));
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