import { useQuery, useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

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
        productId
        productName
        productSku
        quantity
        unitPrice
        discount
        total
      }
      shippingAddress {
        street
        city
        state
        postalCode
        country
      }
      billingAddress {
        street
        city
        state
        postalCode
        country
      }
      subtotal
      tax
      shippingCost
      discount
      total
      notes
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: UUID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
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
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export default function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const { t } = useI18n();

  const { data, loading, refetch } = useQuery(GET_ORDER_DETAILS, {
    variables: { id: orderId },
  });

  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => refetch(),
  });

  const order = data?.order;

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({
      variables: { id: orderId, status: newStatus },
    });
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
    state: string;
    postalCode: string;
    country: string;
  } | null) => {
    if (!address) return '-';
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
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
                      <option key={status} value={status}>
                        {t(`orders.status.${status.toLowerCase()}`)}
                      </option>
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
                <h3 className="mb-3 font-semibold">{t('orders.shippingAddress')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatAddress(order.shippingAddress)}
                </p>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">{t('orders.billingAddress')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatAddress(order.billingAddress)}
                </p>
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
                      productName: string;
                      productSku: string;
                      quantity: number;
                      unitPrice: number;
                      total: number;
                    }) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-500">
                          {item.productSku}
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
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('orders.discount')}</span>
                    <span className="text-green-600">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orders.tax')}</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('orders.shipping')}</span>
                  <span>{formatCurrency(order.shippingCost)}</span>
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
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            {t('orders.orderNotFound')}
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
