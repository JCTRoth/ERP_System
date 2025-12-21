import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const GET_PAYMENT_RECORDS = gql`
  query GetPaymentRecords($first: Int, $where: PaymentRecordFilterInput) {
    paymentRecords(first: $first, where: $where, order: { paymentDate: DESC }) {
      nodes {
        id
        paymentDate
        amount
        currency
        paymentMethod
        reference
        notes
        invoiceId
        invoice {
          id
          invoiceNumber
        }
        createdAt
      }
      totalCount
    }
  }
`;

const DELETE_PAYMENT_RECORD = gql`
  mutation DeletePaymentRecord($id: UUID!) {
    deletePaymentRecord(id: $id)
  }
`;

interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  invoiceId: string | null;
  invoice: { id: string; invoiceNumber: string } | null;
  createdAt: string;
}

export default function PaymentsTab() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentRecord | null>(null);

  const { data, loading, refetch, error } = useQuery(GET_PAYMENT_RECORDS, {
    variables: {
      first: 100,
    },
    errorPolicy: 'all',
  });

  const [deletePaymentRecord] = useMutation(DELETE_PAYMENT_RECORD, {
    onCompleted: () => {
      setDeleteConfirm(null);
      refetch();
    },
  });

  const handleAddClick = () => {
    setEditingPayment(null);
    setShowModal(true);
  };

  const handleEditClick = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setShowModal(true);
  };

  const handleDeleteClick = (payment: PaymentRecord) => {
    setDeleteConfirm(payment);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await deletePaymentRecord({ variables: { id: deleteConfirm.id } });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPayment(null);
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

  // Handle unavailable service
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Payment Records data could not be loaded. This feature will be available when the accounting service is deployed.
        </p>
      </div>
    );
  }

  const payments = data?.paymentRecords?.nodes || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('accounting.payments')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('accounting.paymentsSubtitle') || 'Record and manage payment transactions'}
          </p>
        </div>
        <button onClick={handleAddClick} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {t('accounting.addPayment') || 'Add Payment'}
        </button>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.paymentDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.paymentMethod')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.reference')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.invoice')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {t('accounting.noPayments') || 'No payment records found'}
                  </td>
                </tr>
              ) : (
                payments.map((payment: PaymentRecord) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {t(`accounting.paymentMethod.${payment.paymentMethod.toLowerCase()}`) || payment.paymentMethod}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {payment.reference || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {payment.invoice ? (
                        <span className="font-mono text-sm">{payment.invoice.invoiceNumber}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(payment)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment)}
                          className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal would go here - simplified for now */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold">
              {editingPayment ? t('accounting.editPayment') || 'Edit Payment' : t('accounting.addPayment') || 'Add Payment'}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Payment modal implementation pending - will be added in next iteration.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleModalClose}
                className="btn-secondary"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              {t('accounting.confirmDeletePayment') || 'Delete Payment Record'}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('accounting.confirmDeletePaymentMessage', {
                amount: formatCurrency(deleteConfirm.amount, deleteConfirm.currency),
                date: formatDate(deleteConfirm.paymentDate),
              }) || `Are you sure you want to delete this payment record of ${formatCurrency(deleteConfirm.amount, deleteConfirm.currency)} from ${formatDate(deleteConfirm.paymentDate)}? This action cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn-danger"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}