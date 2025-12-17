import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import OrderModal from './OrderModal';
import OrderDetailsModal from './OrderDetailsModal';

const GET_ORDERS = gql`
  query GetOrders($first: Int, $after: String, $where: OrderFilterInput) {
    orders(first: $first, after: $after, where: $where, order: { createdAt: DESC }) {
      nodes {
        id
        orderNumber
        status
        customer {
          id
          firstName
          lastName
          email
        }
        subtotal
        taxAmount
        shippingAmount
        discountAmount
        total
        itemCount
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const CANCEL_ORDER = gql`
  mutation CancelOrder($id: UUID!) {
    cancelOrder(id: $id) {
      id
      status
    }
  }
`;

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  createdAt: string;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SHIPPED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

export default function OrdersPage() {
  const { t } = useI18n();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, loading, refetch } = useQuery(GET_ORDERS, {
    variables: {
      first: 20,
      where: statusFilter !== 'all' ? { status: { eq: statusFilter } } : undefined,
    },
    errorPolicy: 'all',
  });

  const [cancelOrder] = useMutation(CANCEL_ORDER, {
    onCompleted: () => refetch(),
  });

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCancelOrder = async (id: string) => {
    if (window.confirm(t('orders.confirmCancel'))) {
      await cancelOrder({ variables: { id } });
    }
  };

  const filteredOrders = data?.orders?.nodes?.filter((order: Order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${order.customer?.firstName} ${order.customer?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('orders.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('orders.createOrder')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('orders.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="all">{t('orders.allStatuses')}</option>
          <option value="PENDING">{t('orders.status.pending')}</option>
          <option value="CONFIRMED">{t('orders.status.confirmed')}</option>
          <option value="PROCESSING">{t('orders.status.processing')}</option>
          <option value="SHIPPED">{t('orders.status.shipped')}</option>
          <option value="DELIVERED">{t('orders.status.delivered')}</option>
          <option value="CANCELLED">{t('orders.status.cancelled')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('orders.orderNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('orders.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('orders.items')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('orders.total')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.date')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredOrders?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {t('orders.noOrders')}
                  </td>
                </tr>
              ) : (
                filteredOrders?.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono font-medium">{order.orderNumber}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {order.customer ? (
                        <div>
                          <p className="font-medium">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{order.customer.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('orders.guestOrder')}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.PENDING
                        }`}
                      >
                        {t(`orders.status.${order.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      {order.itemCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title={t('orders.viewDetails')}
                        >
                          <ClipboardDocumentListIcon className="h-5 w-5" />
                        </button>
                        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.status !== 'REFUNDED' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title={t('orders.cancel')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {data?.orders?.totalCount !== undefined && data.orders.totalCount >= 0 && (
          <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              {t('common.showing')} {filteredOrders?.length || 0} {t('common.of')}{' '}
              {data.orders.totalCount} {t('orders.orders')}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <OrderModal onClose={() => { setIsCreateModalOpen(false); refetch(); }} />
      )}
      {selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
