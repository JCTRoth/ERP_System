import { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProductsForOrder {
    products(first: 100, where: { isActive: { eq: true } }) {
      nodes {
        id
        sku
        name
        price
        quantity
      }
    }
  }
`;

const GET_CUSTOMERS = gql`
  query GetCustomersForOrder {
    customers(first: 100, where: { isActive: { eq: true } }) {
      nodes {
        id
        firstName
        lastName
        email
      }
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
  const [customerId, setCustomerId] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');

  const { data: productsData } = useQuery(GET_PRODUCTS);
  const { data: customersData } = useQuery(GET_CUSTOMERS);
  const [createOrder, { loading }] = useMutation(CREATE_ORDER);

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
        (p: { id: string; price: number; name: string }) => p.id === updates.productId
      );
      if (product) {
        newItems[index].unitPrice = product.price;
        newItems[index].productName = product.name;
      }
    }
    
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert(t('orders.addItemsRequired'));
      return;
    }

    try {
      await createOrder({
        variables: {
          input: {
            customerId: customerId || null,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
            notes: notes || null,
          },
        },
      });
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input mt-1 w-full"
            >
              <option value="">{t('orders.guestOrder')}</option>
              {customersData?.customers?.nodes?.map((customer: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
              }) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName} ({customer.email})
                </option>
              ))}
            </select>
          </div>

          {/* Order Items */}
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
                        {productsData?.products?.nodes?.map((product: {
                          id: string;
                          name: string;
                          sku: string;
                          price: number;
                        }) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - {formatCurrency(product.price)}
                          </option>
                        ))}
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
                  <span className="text-gray-600 dark:text-gray-400">{t('orders.tax')} (10%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-600">
                  <span>{t('orders.total')}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

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
