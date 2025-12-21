import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import InvoiceModal from './InvoiceModal';

const GET_INVOICES = gql`
  query GetInvoices($first: Int, $where: InvoiceFilterInput) {
    invoices(first: $first, where: $where, order: { invoiceDate: DESC }) {
      nodes {
        id
        invoiceNumber
        type
        status
        customerId
        customerName
        invoiceDate
        dueDate
        subtotal
        taxAmount
        totalAmount
        paidAmount
        balanceDue
        currency
      }
      totalCount
    }
  }
`;

const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: UUID!) {
    deleteInvoice(id: $id)
  }
`;

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  VOID: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

export default function InvoicesTab() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, loading, refetch, error } = useQuery(GET_INVOICES, {
    variables: {
      first: 100,
      where: {
        ...(typeFilter !== 'all' && { type: { eq: typeFilter } }),
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
      },
    },
    errorPolicy: 'all',
  });

  const [deleteInvoice] = useMutation(DELETE_INVOICE, {
    errorPolicy: 'all',
    onCompleted: () => {
      refetch();
    },
  });

  // Handle unavailable service
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Invoices data could not be loaded. This feature will be available when the accounting service is deployed.
        </p>
      </div>
    );
  }

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm(t('accounting.confirmDeleteInvoice') || 'Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice({ variables: { id: invoice.id } });
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
    refetch();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'PAID' && status !== 'CANCELLED' && status !== 'VOID' && new Date(dueDate) < new Date();
  };

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('accounting.allTypes')}</option>
            <option value="SALES">{t('accounting.salesInvoice')}</option>
            <option value="PURCHASE">{t('accounting.purchaseInvoice')}</option>
            <option value="CREDIT_NOTE">{t('accounting.creditNote')}</option>
            <option value="DEBIT_NOTE">{t('accounting.debitNote')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('accounting.allStatuses')}</option>
            <option value="DRAFT">{t('accounting.status.draft')}</option>
            <option value="PENDING">{t('accounting.status.pending')}</option>
            <option value="SENT">{t('accounting.status.sent')}</option>
            <option value="PARTIAL">{t('accounting.status.partial')}</option>
            <option value="PAID">{t('accounting.status.paid')}</option>
            <option value="OVERDUE">{t('accounting.status.overdue')}</option>
          </select>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('accounting.createInvoice')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.invoiceNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.invoiceDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.dueDate')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.total')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.balance')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : data?.invoices?.nodes?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    {t('accounting.noInvoices')}
                  </td>
                </tr>
              ) : (
                data?.invoices?.nodes?.map((invoice: Invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {invoice.customerName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm">
                        {t(`accounting.type.${invoice.type.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          isOverdue(invoice.dueDate, invoice.status)
                            ? INVOICE_STATUS_COLORS.OVERDUE
                            : INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.DRAFT
                        }`}
                      >
                        {isOverdue(invoice.dueDate, invoice.status)
                          ? t('accounting.status.overdue')
                          : t(`accounting.status.${invoice.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600' : 'text-gray-500'}>
                        {formatDate(invoice.dueDate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className={invoice.balanceDue > 0 ? 'font-medium text-red-600' : 'text-green-600'}>
                        {formatCurrency(invoice.balanceDue, invoice.currency)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title={t('common.view')}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDelete(invoice)}
                            className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                            title={t('common.delete')}
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
