import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon, PlusIcon, TrashIcon, InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useCurrency } from '../../hooks/useCurrency';
import { getShopApolloClient } from '../../lib/apollo';

const shopClient = getShopApolloClient();

const CREATE_ORDER = gql`
  mutation CreateOrder($input: ShopCreateOrderInput!) {
    createShopOrder(input: $input) {
      id
      orderNumber
      shippingAddress {
        name
        street
        city
        postalCode
        country
        phone
      }
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProductsForOrder {
    products(first: 50) {
      nodes {
        id
        sku
        name
        price
        stockQuantity
      }
    }
  }
`;

const GET_CUSTOMERS = gql`
  query GetCustomersForOrder {
    customers(first: 50) {
      nodes {
        id
        name
        contactPerson
        email
      }
      totalCount
    }
  }
`;

const GET_TAX_CODES = gql`
  query GetTaxCodes {
    taxCodes {
      id
      code
      name
      rate
    }
  }
`;

const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      contactPerson
    }
  }
`;

const ADD_CUSTOMER_ADDRESS = gql`
  mutation AddCustomerAddress($customerId: UUID!, $input: CreateAddressInput!) {
    addCustomerAddress(customerId: $customerId, input: $input) {
      id
      addressLine1
      city
      postalCode
      country
    }
  }
`;

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderModalProps {
  onClose: () => void;
}

export default function OrderModal({ onClose }: OrderModalProps) {
  const { t } = useI18n();
  useEscapeKey(onClose);
  console.log('OrderModal rendered');
  const [customerId, setCustomerId] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [createCustomerFromAddress, setCreateCustomerFromAddress] = useState(true);
  const [updateCustomerAddress, setUpdateCustomerAddress] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [useDifferentBillingAddress, setUseDifferentBillingAddress] = useState(false);
  const [selectedTaxCodeId, setSelectedTaxCodeId] = useState<string>('');
  const [taxRate, setTaxRate] = useState(0.19); // Default 19%
  
  // Shipping Address
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  
  // Billing Address (optional, if different from shipping)
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCountry, setBillingCountry] = useState('');

  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(GET_PRODUCTS, ({ client: shopClient } as any));
  const { data: customersData, loading: customersLoading, error: customersError } = useQuery(GET_CUSTOMERS, ({} as any));
  const { data: taxCodesData, loading: taxCodesLoading, error: taxCodesError } = useQuery(GET_TAX_CODES, ({ client: shopClient } as any));
  const [createOrder, { loading }] = useMutation(CREATE_ORDER, ({ client: shopClient } as any));
  const [createCustomerMutation] = useMutation(CREATE_CUSTOMER);
  const [addCustomerAddressMutation] = useMutation(ADD_CUSTOMER_ADDRESS);

  // Set default tax code to standard rate (19%) when data loads
  useEffect(() => {
    if (taxCodesData?.taxCodes && !selectedTaxCodeId) {
      const standardRate = taxCodesData.taxCodes.find((tc: { rate: number }) => tc.rate === 19);
      if (standardRate) {
        setSelectedTaxCodeId(standardRate.id);
        setTaxRate(0.19);
      }
    }
  }, [taxCodesData, selectedTaxCodeId]);

  // Debug logs
  useEffect(() => {
    console.log('Products data:', productsData);
    console.log('Products loading:', productsLoading);
    console.log('Products error:', productsError);
    console.log('Customers data:', customersData);
    console.log('Customers loading:', customersLoading);
    console.log('Customers error:', customersError);
  }, [productsData, productsLoading, productsError, customersData, customersLoading, customersError]);

  // Handle customer selection change
  const handleCustomerChange = (value: string) => {
    if (value === '__new__') {
      setCustomerId('');
      setIsNewCustomer(true);
      setCreateCustomerFromAddress(true);
      setUpdateCustomerAddress(false);
      // Clear address fields for fresh input
      setShippingName('');
      setShippingAddress('');
      setShippingCity('');
      setShippingPostalCode('');
      setShippingCountry('');
      setShippingPhone('');
    } else {
      setCustomerId(value);
      setIsNewCustomer(false);
      setCreateCustomerFromAddress(false);
      setUpdateCustomerAddress(false);
      setNewCustomerName('');
      setNewCustomerEmail('');
      setNewCustomerPhone('');
    }
  };

  // Auto-fill shipping address from customer master data when customer is selected and shipping address is empty
  useEffect(() => {
    if (customerId && !isNewCustomer && customersData?.customers?.nodes) {
      const selectedCustomer = customersData.customers.nodes.find((c: any) => c.id === customerId);
      
      if (selectedCustomer && 
          !shippingName && 
          !shippingAddress && 
          !shippingCity && 
          !shippingPostalCode && 
          !shippingCountry) {
            
        // Fill shipping address from customer's default address
        if (selectedCustomer.defaultAddress) {
          setShippingName(selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim());
          setShippingAddress(selectedCustomer.defaultAddress.street || '');
          setShippingCity(selectedCustomer.defaultAddress.city || '');
          setShippingPostalCode(selectedCustomer.defaultAddress.postalCode || selectedCustomer.defaultAddress.zip || '');
          setShippingCountry(selectedCustomer.defaultAddress.country || '');
          setShippingPhone(selectedCustomer.phone || selectedCustomer.defaultAddress.phone || '');
        }
        // If no default address, try the first address in the addresses array
        else if (selectedCustomer.addresses && selectedCustomer.addresses.length > 0) {
          const firstAddress = selectedCustomer.addresses[0];
          setShippingName(selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim());
          setShippingAddress(firstAddress.street || '');
          setShippingCity(firstAddress.city || '');
          setShippingPostalCode(firstAddress.postalCode || firstAddress.zip || '');
          setShippingCountry(firstAddress.country || '');
          setShippingPhone(selectedCustomer.phone || firstAddress.phone || '');
        }
        // If no address data, just set the customer name
        else {
          setShippingName(selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim());
          setShippingPhone(selectedCustomer.phone || '');
        }
      }
    }
  }, [customerId, isNewCustomer, customersData, shippingName, shippingAddress, shippingCity, shippingPostalCode, shippingCountry]);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<OrderItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // If product changed, update price
    if (updates.productId) {
      const product = productsData?.products?.nodes?.find(
        (p: { id: string; price: number; name: string; stockQuantity: number }) => p.id === updates.productId
      );
      if (product) {
        newItems[index].unitPrice = product.price;
        newItems[index].productName = product.name;
      }
    }
    
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId && !isNewCustomer) {
      alert(t('orders.customerRequired'));
      return;
    }

    if (isNewCustomer && !newCustomerName.trim()) {
      alert(t('orders.customerNameRequired') || 'Customer name is required');
      return;
    }
    
    if (items.length === 0) {
      alert(t('orders.addItemsRequired'));
      return;
    }

    if (!shippingName || !shippingAddress || !shippingCity || !shippingPostalCode || !shippingCountry) {
      alert(t('orders.shippingAddressRequired'));
      return;
    }

    try {
      let orderCustomerId = customerId;

      // Create new customer if needed
      if (isNewCustomer) {
        const customerInput: any = {
          name: newCustomerName.trim(),
          type: 'Company',
          email: newCustomerEmail || null,
          phone: newCustomerPhone || null,
        };

        // Include address in customer creation if checkbox is checked
        if (createCustomerFromAddress) {
          customerInput.addresses = [{
            type: 'Main',
            addressLine1: shippingAddress,
            city: shippingCity,
            postalCode: shippingPostalCode,
            country: shippingCountry,
            isDefault: true,
          }];
        }

        const customerResult = await createCustomerMutation({
          variables: { input: customerInput },
        });
        orderCustomerId = customerResult.data.createCustomer.id;
      }
      // Update existing customer address if checkbox is checked
      else if (updateCustomerAddress && customerId) {
        try {
          await addCustomerAddressMutation({
            variables: {
              customerId,
              input: {
                type: 'Shipping',
                addressLine1: shippingAddress,
                city: shippingCity,
                postalCode: shippingPostalCode,
                country: shippingCountry,
                isDefault: false,
              },
            },
          });
        } catch (addrError) {
          console.warn('Failed to update customer address:', addrError);
        }
      }

      await createOrder(({
        variables: {
          input: {
            customerId: orderCustomerId,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            notes: notes || null,
            taxRate: taxRate,
            shippingName,
            shippingAddress,
            shippingCity,
            shippingPostalCode,
            shippingCountry,
            shippingPhone: shippingPhone || null,
            billingName: useDifferentBillingAddress ? billingName || null : null,
            billingAddress: useDifferentBillingAddress ? billingAddress || null : null,
            billingCity: useDifferentBillingAddress ? billingCity || null : null,
            billingPostalCode: useDifferentBillingAddress ? billingPostalCode || null : null,
            billingCountry: useDifferentBillingAddress ? billingCountry || null : null,
          },
        },
      } as any));
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const { formatCurrency } = useCurrency();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('orders.createOrder')}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('orders.customer')}
            </label>
            <select
              value={isNewCustomer ? '__new__' : customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="input mt-1 w-full"
              required={!isNewCustomer}
              disabled={customersLoading}
            >
              <option value="">
                {customersLoading
                  ? t('common.loading')
                  : customersError
                  ? t('common.error')
                  : t('orders.selectCustomer')
                }
              </option>
              <option value="__new__">
                ＋ {t('orders.newCustomer') || 'New Customer'}
              </option>
              {!customersLoading && !customersError && customersData?.customers?.nodes?.map((customer: {
                id: string;
                name: string;
                contactPerson: string;
                email: string;
              }) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.contactPerson ? `(${customer.contactPerson})` : ''} {customer.email ? `<${customer.email}>` : ''}
                </option>
              ))}
            </select>
            {customersError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {t('common.error')} {t('orders.customer').toLowerCase()}
              </p>
            )}

            {/* New Customer Inline Fields */}
            {isNewCustomer && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                  <UserPlusIcon className="h-4 w-4" />
                  {t('orders.newCustomerDetails') || 'New Customer Details'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t('orders.customerName') || 'Customer Name *'}
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="input col-span-2"
                    required
                  />
                  <input
                    type="email"
                    placeholder={t('orders.customerEmail') || 'Email'}
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="input"
                  />
                  <input
                    type="tel"
                    placeholder={t('orders.phone') || 'Phone'}
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tax Code Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('orders.tax')}
            </label>
            <select
              value={selectedTaxCodeId}
              onChange={(e) => {
                setSelectedTaxCodeId(e.target.value);
                // Find the selected tax code and update the tax rate
                const selected = taxCodesData?.taxCodes?.find(
                  (tc: { id: string; code: string; name: string; rate: number }) => tc.id === e.target.value
                );
                if (selected) {
                  setTaxRate(selected.rate / 100); // Convert percentage to decimal
                }
              }}
              className="input mt-1 w-full"
              disabled={taxCodesLoading}
            >
              <option value="">
                {taxCodesLoading
                  ? t('common.loading')
                  : taxCodesError
                  ? t('common.error')
                  : 'Select tax code'
                }
              </option>
              {!taxCodesLoading && !taxCodesError && taxCodesData?.taxCodes?.map((taxCode: {
                id: string;
                code: string;
                name: string;
                rate: number;
              }) => (
                <option key={taxCode.id} value={taxCode.id}>
                  {taxCode.name} ({taxCode.rate}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('orders.items')}
              </label>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary flex items-center gap-1 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                {t('orders.addItem')}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                <p className="text-gray-500">{t('orders.noItemsYet')}</p>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-primary-600 hover:text-primary-700"
                >
                  {t('orders.addFirstItem')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, { productId: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="">{t('orders.selectProduct')}</option>
                        {productsData?.products?.nodes?.length === 0 ? (
                          <option value="" disabled>
                            {t('orders.noProductsAvailable')}
                          </option>
                        ) : (
                          productsData?.products?.nodes?.map((product: {
                            id: string;
                            name: string;
                            sku: string;
                            price: number;
                            stockQuantity: number;
                          }) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku}) - {formatCurrency(product.price)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) })}
                        className="input w-full"
                        placeholder={t('orders.qty')}
                      />
                    </div>
                    <div className="w-28 text-right font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {items.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('orders.subtotal')}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('orders.tax')} ({(taxRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-600">
                  <span>{t('orders.total')}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Address */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">{t('orders.shippingAddress')}</h3>
            {shippingName && (
              <div className="mb-3 rounded bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <InformationCircleIcon className="inline h-4 w-4" /> 
                <span className="ml-1">
                  {t('orders.shippingAddressAutoFilled')}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('orders.fullName')}
                value={shippingName}
                onChange={(e) => setShippingName(e.target.value)}
                className="input col-span-2"
                required
              />
              <input
                type="text"
                placeholder={t('orders.address')}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="input col-span-2"
                required
              />
              <input
                type="text"
                placeholder={t('orders.city')}
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
                className="input"
                required
              />
              <input
                type="text"
                placeholder={t('orders.postalCode')}
                value={shippingPostalCode}
                onChange={(e) => setShippingPostalCode(e.target.value)}
                className="input"
                required
              />
              <input
                type="text"
                placeholder={t('orders.country')}
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
                className="input col-span-2"
                required
              />
              <input
                type="tel"
                placeholder={t('orders.phone')}
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                className="input col-span-2"
              />
            </div>

            {/* Create Customer from Address / Update Customer Address */}
            {isNewCustomer && (
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createCustomerFromAddress}
                    onChange={(e) => setCreateCustomerFromAddress(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('orders.createCustomerFromAddress') || 'Create new Customer from Address'}
                  </span>
                </label>
              </div>
            )}
            {!isNewCustomer && customerId && (
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={updateCustomerAddress}
                    onChange={(e) => setUpdateCustomerAddress(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('orders.updateCustomerAddress') || 'Update customer Address'}
                  </span>
                </label>
              </div>
            )}

            {/* Different Billing Address Checkbox */}
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useDifferentBillingAddress}
                  onChange={(e) => setUseDifferentBillingAddress(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('orders.useDifferentBillingAddress')}
                </span>
              </label>
            </div>

            {/* Billing Address (conditionally shown) */}
            {useDifferentBillingAddress && (
              <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">{t('orders.billingAddress')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t('orders.fullName')}
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    className="input col-span-2"
                  />
                  <input
                    type="text"
                    placeholder={t('orders.address')}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="input col-span-2"
                  />
                  <input
                    type="text"
                    placeholder={t('orders.city')}
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder={t('orders.postalCode')}
                    value={billingPostalCode}
                    onChange={(e) => setBillingPostalCode(e.target.value)}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder={t('orders.country')}
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="input col-span-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('orders.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input mt-1 w-full"
              rows={3}
              placeholder={t('orders.notesPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={loading || items.length === 0}
            >
              {loading ? t('common.creating') : t('orders.createOrder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
