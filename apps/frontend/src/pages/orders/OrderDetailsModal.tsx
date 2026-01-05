import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { shopApolloClient } from '../../lib/apollo';

const GET_ORDER_DETAILS = gql`
  query GetOrderDetails($id: UUID!) {
    order(id: $id) {
      id
      orderNumber
      status
      customer {
        id
        firstName
        lastName
        email
        phone
      }
      items {
        id
        quantity
        unitPrice
        discount
        total
        product {
          id
          name
          sku
        }
      }
      shippingAddress {
        street
        city
        postalCode
        country
      }
      billingAddress {
        street
        city
        postalCode
        country
      }
      subtotal
      taxAmount
      shippingAmount
      discountAmount
      total
      notes
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      id
      status
    }
  }
`;

const UPDATE_ORDER_ADDRESSES = gql`
  mutation UpdateOrderAddresses($input: UpdateOrderAddressesInput!) {
    updateOrderAddresses(input: $input) {
      id
      shippingAddress {
        street
        city
        postalCode
        country
      }
      billingAddress {
        street
        city
        postalCode
        country
      }
    }
  }
`;

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

const ORDER_STATUS_OPTIONS = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'ON_HOLD',
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
};

export default function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const { t } = useI18n();
  const [editingAddresses, setEditingAddresses] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const { data, loading, refetch } = useQuery(GET_ORDER_DETAILS, {
    variables: { id: orderId },
    client: shopApolloClient,
    onCompleted: (data: any) => {
      if (data?.order?.shippingAddress) {
        setShippingAddress(data.order.shippingAddress);
      }
      // If no billing address is set, use shipping address
      if (data?.order?.billingAddress) {
        setBillingAddress(data.order.billingAddress);
      } else if (data?.order?.shippingAddress) {
        setBillingAddress(data.order.shippingAddress);
      }
    },
  } as any);

  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => refetch(),
    client: shopApolloClient,
  });

  const [updateAddresses] = useMutation(UPDATE_ORDER_ADDRESSES, {
    onCompleted: () => {
      setEditingAddresses(false);
      refetch();
    },
    client: shopApolloClient,
  });

  const order = data?.order;

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({
      variables: { 
        input: { 
          orderId: orderId, 
          status: newStatus 
        } 
      },
    } as any);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null) => {
    if (!address || (!address.street && !address.city && !address.postalCode && !address.country)) {
      return 'N/A';
    }
    const parts = [address.street, address.city, address.postalCode, address.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const handleSaveAddresses = async () => {
    await updateAddresses({
      variables: {
        input: {
          orderId,
          shippingAddress,
          billingAddress,
        },
      },
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {t('orders.orderDetails')}
            </h2>
            {order && (
              <p className="text-gray-500">
                {order.orderNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center">{t('common.loading')}</div>
        ) : order ? (
          <div className="space-y-6">
            {/* Status and Actions */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500">{t('common.status')}:</span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.PENDING
                  }`}
                >
                  {t(`orders.status.${order.status.toLowerCase()}`)}
                </span>
              </div>
              {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{t('orders.changeStatus')}:</span>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="input"
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      status !== 'CANCELLED' && (
                        <option key={status} value={status}>
                          {t(`orders.status.${status.toLowerCase()}`)}
                        </option>
                      )
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3 font-semibold">{t('orders.customerInfo')}</h3>
                {order.customer ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {order.customer.firstName} {order.customer.lastName}
                    </p>
                    <p className="text-gray-500">{order.customer.email}</p>
                    {order.customer.phone && (
                      <p className="text-gray-500">{order.customer.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">{t('orders.guestOrder')}</p>
                )}
              </div>
              <div>
                <h3 className="mb-3 font-semibold">{t('orders.orderInfo')}</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500">{t('orders.created')}:</span>{' '}
                    {formatDate(order.createdAt)}
                  </p>
                  <p>
                    <span className="text-gray-500">{t('orders.updated')}:</span>{' '}
                    {formatDate(order.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{t('orders.shippingAddress')}</h3>
                  <button
                    onClick={() => setEditingAddresses(!editingAddresses)}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
                {editingAddresses ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('orders.street')}
                      value={shippingAddress.street}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, street: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.city')}
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.postalCode')}
                      value={shippingAddress.postalCode}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.country')}
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, country: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatAddress(shippingAddress)}
                  </p>
                )}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{t('orders.billingAddress')}</h3>
                </div>
                {editingAddresses ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('orders.street')}
                      value={billingAddress.street}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, street: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.city')}
                      value={billingAddress.city}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, city: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.postalCode')}
                      value={billingAddress.postalCode}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, postalCode: e.target.value })
                      }
                      className="input w-full"
                    />
                    <input
                      type="text"
                      placeholder={t('orders.country')}
                      value={billingAddress.country}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, country: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatAddress(billingAddress)}
                  </p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="mb-3 font-semibold">{t('orders.items')}</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        {t('orders.product')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        {t('products.sku')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        {t('orders.qty')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        {t('orders.unitPrice')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        {t('orders.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {order.items.map((item: {
                      id: string;
                      product?: { id: string; name?: string; sku?: string };
                      quantity: number;
                      unitPrice: number;
                      total: number;
                    }, index: number) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-center font-medium text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.product?.name}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-500">
                          {item.product?.sku}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orders.subtotal')}</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('orders.discount')}</span>
                    <span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orders.tax')}</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orders.shipping')}</span>
                  <span>{formatCurrency(order.shippingAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-600">
                  <span>{t('orders.total')}</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div>
                <h3 className="mb-2 font-semibold">{t('orders.notes')}</h3>
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {order.notes}
                </p>
              </div>
            )}

            {/* Order Documents */}
            <div>
              <h3 className="mb-3 font-semibold">Order Documents</h3>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
                {/* Documents List - Will be populated from backend */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No documents created yet for this order.
                  </p>
                  {/* Documents will be rendered here when available */}
                  {/* Example structure:
                  <div className="flex items-center justify-between rounded bg-white p-3 dark:bg-gray-800">
                    <div>
                      <p className="font-medium">Invoice #001</p>
                      <p className="text-xs text-gray-500">Created on 2026-01-05</p>
                    </div>
                    <a
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open PDF
                    </a>
                  </div>
                  */}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            {t('orders.orderNotFound')}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          {editingAddresses && (
            <>
              <button
                onClick={() => setEditingAddresses(false)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveAddresses}
                className="btn-primary"
              >
                {t('common.save')}
              </button>
            </>
          )}
          {!editingAddresses && (
            <button onClick={onClose} className="btn-secondary">
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
