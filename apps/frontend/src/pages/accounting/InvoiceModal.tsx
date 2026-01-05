import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import Tooltip from '../../components/Tooltip';
import { shopApolloClient } from '../../lib/apollo';

// Helper function to format UUID with dashes
const formatUUID = (uuid: string): string => {
  if (!uuid) return '';
  // Remove any existing dashes
  const cleaned = uuid.replace(/-/g, '');
  // Check if it's a valid hex string (32 chars)
  if (cleaned.length !== 32) return uuid;
  // Format as standard UUID: 8-4-4-4-12
  return `${cleaned.substring(0, 8)}-${cleaned.substring(8, 12)}-${cleaned.substring(12, 16)}-${cleaned.substring(16, 20)}-${cleaned.substring(20)}`;
};

const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
    }
  }
`;

const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: UUID!, $input: UpdateInvoiceInput!) {
    updateInvoice(id: $id, input: $input) {
      id
      invoiceNumber
    }
  }
`;

const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: UUID!) {
    deleteInvoice(id: $id)
  }
`;

const GET_ACCOUNTS = gql`
  query GetAccountsForInvoice {
    accounts(where: { isActive: { eq: true } }) {
      nodes {
        id
        accountNumber
        name
        type
      }
    }
  }
`;

const GET_ORDERS = gql`
  query GetOrdersForInvoice {
    orders(first: 50, where: { status: { in: [CONFIRMED, SHIPPED, DELIVERED] } }) {
      nodes {
        id
        orderNumber
        status
        total
        subtotal
        taxAmount
        customerId
      }
    }
  }
`;

const GET_ORDER_DETAILS = gql`
  query GetOrderDetailsForInvoice($id: UUID!) {
    order(id: $id) {
      id
      orderNumber
      subtotal
      taxAmount
      total
      customerId
      items {
        id
        productId
        productName
        productSku
        quantity
        unitPrice
        total
      }
    }
  }
`;

const GET_CUSTOMERS = gql`
  query GetCustomersForInvoice {
    customers(first: 50) {
      nodes {
        id
        name
        customerNumber
        email
        phone
        website
        taxId
        creditLimit
        status
      }
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProductsForInvoice {
    products(first: 50) {
      nodes {
        id
        name
        sku
        price
      }
    }
  }
`;

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  accountId: string;
  taxRate: number;
  discountPercent?: number;
  productId?: string;
  sku?: string;
  unit?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
}

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  const { t } = useI18n();
  const isEditing = !!invoice;

  const [formData, setFormData] = useState({
    type: 'SalesInvoice',
    orderId: '',
    orderNumber: '',
    customerId: '',
    customerName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, accountId: '', taxRate: 0, discountPercent: 0 },
  ]);

  const [validationError, setValidationError] = useState<string>('');

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const { data: ordersData } = useQuery(GET_ORDERS, { client: shopApolloClient });
  const { data: customersData, loading: customersLoading, error: customersError } = useQuery(GET_CUSTOMERS);
  const { data: productsData } = useQuery(GET_PRODUCTS, { client: shopApolloClient });
  const { data: orderDetailsData } = useQuery(GET_ORDER_DETAILS, {
    variables: { id: formData.orderId },
    skip: !formData.orderId,
    client: shopApolloClient,
  });

  const [createInvoice, { loading: createLoading }] = useMutation(CREATE_INVOICE);
  const [updateInvoice, { loading: updateLoading }] = useMutation(UPDATE_INVOICE);
  const [deleteInvoice, { loading: deleteLoading }] = useMutation(DELETE_INVOICE);

  const loading = createLoading || updateLoading || deleteLoading;

  // Debug customers data
  useEffect(() => {
    console.log('Customers data:', customersData);
    console.log('Customers loading:', customersLoading);
    console.log('Customers error:', customersError);
  }, [customersData, customersLoading, customersError]);

  // Auto-populate from order when selected
  useEffect(() => {
    console.log('Order details data:', orderDetailsData);
    if (orderDetailsData?.order) {
      const order = orderDetailsData.order;
      // Find customer name from customersData
      const customer = customersData?.customers?.nodes?.find(
        (c: any) => c.id === order.customerId
      );
      
      // Set customer ID and name from order only if user hasn't selected a customer yet
      setFormData((prev) => {
        const shouldSetCustomer = !prev.customerId;
        return {
          ...prev,
          orderNumber: order.orderNumber || prev.orderNumber,
          customerId: shouldSetCustomer ? (order.customerId || prev.customerId) : prev.customerId,
          customerName: shouldSetCustomer ? (customer?.name || prev.customerName) : prev.customerName,
          currency: order.currency || prev.currency,
        };
      });

      // Convert order items to invoice line items
      if (order.items && order.items.length > 0) {
        setLineItems(
          order.items.map((item: any) => ({
            description: item.productName || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            accountId: '', // Will need to be selected
            discountPercent: 0,
            // Use item.taxRate if provided; otherwise default to 19 (percent)
            // Normalize taxRate: if given as fraction (0.19) convert to percent (19)
            taxRate: (item.taxRate !== undefined && item.taxRate !== null)
              ? (item.taxRate > 1 ? item.taxRate : item.taxRate * 100)
              : 0,
            productId: item.productId || undefined,
          }))
        );
      }
    }
  }, [orderDetailsData, customersData]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, accountId: '', taxRate: 0, discountPercent: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, updates: Partial<InvoiceLineItem>) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], ...updates };
    setLineItems(newItems);
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = lineItems.reduce((sum, item) => {
    const rawRate = item.taxRate ?? 0;
    // Support both fraction (0.19) and percent (19) values.
    const rate = rawRate > 1 ? rawRate / 100 : rawRate;
    return sum + item.quantity * item.unitPrice * rate;
  }, 0);
  const total = subtotal + taxAmount;

  const handleDelete = async () => {
    if (!invoice) return;

    if (window.confirm(t('accounting.confirmDeleteInvoice') || 'Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice({
          variables: { id: invoice.id },
        });
        onClose();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check required fields
    setValidationError('');
    
    if (!formData.customerId) {
      setValidationError(t('accounting.errorCustomerRequired') || 'Customer is required');
      return;
    }
    
    if (lineItems.length === 0) {
      setValidationError(t('accounting.errorLineItemsRequired') || 'At least one line item is required');
      return;
    }
    
    // Check that all line items have required fields
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description) {
        setValidationError(t('accounting.errorDescriptionRequired') || `Description required for line item ${i + 1}`);
        return;
      }
      if (!item.accountId) {
        setValidationError(t('accounting.errorAccountRequired') || `Account required for line item ${i + 1}`);
        return;
      }
      if (item.quantity <= 0) {
        setValidationError(t('accounting.errorQuantityRequired') || `Quantity must be greater than 0 for line item ${i + 1}`);
        return;
      }
      if (item.unitPrice < 0) {
        setValidationError(t('accounting.errorPriceRequired') || `Unit price cannot be negative for line item ${i + 1}`);
        return;
      }
    }

    try {
      console.log('Creating invoice with data:', {
        type: formData.type,
        customerId: formData.customerId ? formatUUID(formData.customerId) : undefined,
        customerName: formData.customerName,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice.toString()),
          accountId: item.accountId || null,
          taxRate: parseFloat((item.taxRate / 100).toString()),
          discountPercent: item.discountPercent && parseFloat(item.discountPercent.toString()) > 0 ? parseFloat((item.discountPercent / 100).toString()) : undefined,
        }))
      });

      if (isEditing && invoice) {
        await updateInvoice({
          variables: {
            id: formatUUID(invoice.id),
            input: {
              type: formData.type,
              customerId: formData.customerId ? formatUUID(formData.customerId) : undefined,
              orderId: formData.orderId ? formatUUID(formData.orderId) : undefined,
              orderNumber: formData.orderNumber || undefined,
              customerName: formData.customerName || undefined,
              invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : undefined,
              dueDate: new Date(formData.dueDate).toISOString(),
              currency: formData.currency,
              notes: formData.notes || undefined,
              lineItems: lineItems.map((item) => ({
                description: item.description,
                sku: item.sku || undefined,
                productId: item.productId ? formatUUID(item.productId) : undefined,
                accountId: item.accountId ? formatUUID(item.accountId) : undefined,
                quantity: item.quantity,
                unit: item.unit || undefined,
                unitPrice: parseFloat(item.unitPrice.toString()),
                discountPercent: item.discountPercent && parseFloat(item.discountPercent.toString()) > 0 ? parseFloat((item.discountPercent / 100).toString()) : undefined,
                taxRate: parseFloat((item.taxRate / 100).toString()),
              })),
            },
          },
        });
      } else {
        await createInvoice({
          variables: {
            input: {
              type: formData.type,
              customerId: formData.customerId ? formatUUID(formData.customerId) : undefined,
              orderId: formData.orderId ? formatUUID(formData.orderId) : undefined,
              orderNumber: formData.orderNumber || undefined,
              customerName: formData.customerName || undefined,
              invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : undefined,
              dueDate: new Date(formData.dueDate).toISOString(),
              currency: formData.currency,
              notes: formData.notes || undefined,
              lineItems: lineItems.map((item) => ({
                description: item.description,
                sku: item.sku || undefined,
                productId: item.productId ? formatUUID(item.productId) : undefined,
                accountId: item.accountId ? formatUUID(item.accountId) : undefined,
                quantity: item.quantity,
                unit: item.unit || undefined,
                unitPrice: parseFloat(item.unitPrice.toString()),
                discountPercent: item.discountPercent && parseFloat(item.discountPercent.toString()) > 0 ? parseFloat((item.discountPercent / 100).toString()) : undefined,
                taxRate: parseFloat((item.taxRate / 100).toString()),
              })),
            },
          },
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('accounting.editInvoice') : t('accounting.createInvoice')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{validationError}</p>
            </div>
          )}

          {/* Selected Order Summary */}
          {formData.orderId && (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">{t('accounting.selectedOrder') || 'Selected Order'}</h3>
              {orderDetailsData?.order ? (
                <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <div className="font-medium dark:text-gray-100">{orderDetailsData.order.orderNumber}</div>
                  </div>
                  <div className="text-right">
                    <div>{t('orders.total')}: <span className="font-medium dark:text-gray-100">{formatCurrency(orderDetailsData.order.total)}</span></div>
                    <div>{t('orders.subtotal')}: <span className="dark:text-gray-200">{formatCurrency(orderDetailsData.order.subtotal)}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading order details...</div>
              )}
            </div>
          )}
          {/* Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('accounting.selectOrder') || 'Select Order (Optional)'}
            </label>
            <select
              value={formData.orderId}
              onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              className="input mt-1 w-full"
            >
              <option value="">{t('accounting.selectOrder') || 'No Order'}</option>
              {ordersData?.orders?.nodes?.map((order: any) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.status} - ${order.total}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.type')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="SalesInvoice">{t('accounting.salesInvoice')}</option>
                <option value="PurchaseInvoice">{t('accounting.purchaseInvoice')}</option>
                <option value="CreditNote">{t('accounting.creditNote')}</option>
                <option value="DebitNote">{t('accounting.debitNote')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.invoiceDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.dueDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.customerName')} *
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedCustomer = customersData?.customers?.nodes?.find(
                    (c: any) => c.id === selectedId
                  );
                  setFormData({
                    ...formData,
                    customerId: selectedId,
                    customerName: selectedCustomer?.name || '',
                  });
                }}
                className="input mt-1 w-full"
                disabled={customersLoading}
              >
                <option value="">
                  {customersLoading ? t('common.loading') : (customersError ? 'Error loading customers' : t('accounting.selectCustomer') || 'Select Customer')}
                </option>
                {customersData?.customers?.nodes?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              
              {/* Customer Info Box */}
              {formData.customerId && customersData?.customers?.nodes && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                  {(() => {
                    const selectedCustomer = customersData.customers.nodes.find((c: any) => c.id === formData.customerId);
                    return selectedCustomer ? (
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</div>
                        {selectedCustomer.customerNumber && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500 dark:text-gray-500">{t('masterdata.customerNumber')}:</span> {selectedCustomer.customerNumber}
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500 dark:text-gray-500">{t('common.email')}:</span> {selectedCustomer.email}
                          </div>
                        )}
                        {selectedCustomer.phone && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500 dark:text-gray-500">{t('common.phone')}:</span> {selectedCustomer.phone}
                          </div>
                        )}
                        {selectedCustomer.taxId && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500 dark:text-gray-500">{t('masterdata.taxId')}:</span> {selectedCustomer.taxId}
                          </div>
                        )}
                        {selectedCustomer.creditLimit !== undefined && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500 dark:text-gray-500">{t('masterdata.creditLimit')}:</span> {selectedCustomer.creditLimit}
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accounting.lineItems')}
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="btn-secondary flex items-center gap-1 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                {t('accounting.addLine')}
              </button>
            </div>

            {/* Column Headers with Tooltips */}
            <div className="mb-2 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <div className="col-span-3 flex items-center gap-1">
                <span>{t('accounting.product') || 'Product'}</span>
                <Tooltip content="Select a product from the catalog to auto-fill description and price" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <span>{t('accounting.description') || 'Description'}</span>
                <Tooltip content="Item description that appears on the invoice. Auto-filled when selecting a product" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <span>{t('accounting.account') || 'Account'}</span>
                <Tooltip content="GL account for accounting. Required for proper revenue/expense recording" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <span>{t('accounting.qty') || 'Qty'}</span>
                <Tooltip content="Quantity of items being invoiced" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <span>{t('accounting.price') || 'Price'}</span>
                <Tooltip content="Unit price per item" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <span>{t('accounting.tax') || 'Tax %'}</span>
                <Tooltip content="Tax rate (%) applied to this line item. Common rates: 0%, 7%, 19%" position="right">
                  <QuestionMarkCircleIcon className="h-4 w-4 cursor-help opacity-60 hover:opacity-100" />
                </Tooltip>
              </div>
              <div className="col-span-1 text-right">
                <span>{t('accounting.total') || 'Total'}</span>
              </div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="col-span-3">
                    <select
                      value={item.productId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedProduct = productsData?.products?.nodes?.find(
                          (p: any) => p.id === selectedId
                        );
                        updateLineItem(index, {
                          productId: selectedId,
                          description: selectedProduct?.name || item.description,
                          unitPrice: selectedProduct?.price || item.unitPrice,
                        });
                      }}
                      className="input w-full"
                    >
                      <option value="">{t('accounting.selectProduct') || 'Select Product'}</option>
                      {productsData?.products?.nodes?.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder={t('accounting.description')}
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={item.accountId}
                      onChange={(e) => updateLineItem(index, { accountId: e.target.value })}
                      className={`input w-full ${!item.accountId ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''}`}
                      required
                    >
                      <option value="">{t('accounting.selectAccount')} *</option>
                      {accountsData?.accounts?.nodes?.map((account: {
                        id: string;
                        accountNumber: string;
                        name: string;
                      }) => (
                        <option key={account.id} value={account.id}>
                          {account.accountNumber} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder={t('accounting.qty')}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, { quantity: parseInt(e.target.value) })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('accounting.price')}
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, { unitPrice: parseFloat(e.target.value) })}
                      className="input flex-1 w-full"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, { taxRate: parseFloat(e.target.value) })}
                      className="input w-full"
                    >
                      <option value="0">0%</option>
                      <option value="7">7%</option>
                      <option value="16">16%</option>
                      <option value="19">19%</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      disabled={lineItems.length === 1}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('accounting.subtotal')}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('accounting.tax')}</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-600">
                <span>{t('accounting.total')}</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('accounting.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input mt-1 w-full"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger"
                disabled={loading}
              >
                {deleteLoading ? t('common.deleting') : t('common.delete')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
