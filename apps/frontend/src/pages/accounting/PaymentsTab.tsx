import { FormEvent, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../providers/I18nProvider";

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

const GET_INVOICES = gql`
  query GetInvoices {
    invoices(first: 100) {
      nodes {
        id
        invoiceNumber
      }
      totalCount
    }
  }
`;

const CREATE_PAYMENT_RECORD = gql`
  mutation CreatePaymentRecord($input: CreatePaymentRecordInput!) {
    createPaymentRecord(input: $input) {
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
  }
`;

const UPDATE_PAYMENT_RECORD = gql`
  mutation UpdatePaymentRecord($input: UpdatePaymentRecordInput!) {
    updatePaymentRecord(input: $input) {
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

interface Invoice {
  id: string;
  invoiceNumber: string;
}

export default function PaymentsTab() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentRecord | null>(
    null,
  );
  const [formState, setFormState] = useState({
    amount: "",
    currency: "EUR",
    paymentDate: new Date().toISOString().split("T")[0],
    method: "BankTransfer",
    reference: "",
    notes: "",
    invoiceId: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, refetch, error } = useQuery(GET_PAYMENT_RECORDS, {
    variables: {
      first: 100,
    },
    errorPolicy: "all",
  });

  const { data: invoicesData } = useQuery(GET_INVOICES, {
    errorPolicy: "all",
  });

  const [deletePaymentRecord] = useMutation(DELETE_PAYMENT_RECORD, {
    onCompleted: () => {
      setDeleteConfirm(null);
      refetch();
    },
  });

  const [createPaymentRecord, { loading: saving }] = useMutation(
    CREATE_PAYMENT_RECORD,
    {
      onCompleted: () => {
        setShowModal(false);
        setEditingPayment(null);
        refetch();
      },
      onError: (err) => {
        console.error("CreatePaymentRecord error:", err);
        setFormError(err.message || "Failed to save payment");
      },
    },
  );

  const [updatePaymentRecord, { loading: updating }] = useMutation(
    UPDATE_PAYMENT_RECORD,
    {
      onCompleted: () => {
        setShowModal(false);
        setEditingPayment(null);
        refetch();
      },
      onError: (err) => {
        console.error("UpdatePaymentRecord error:", err);
        setFormError(err.message || "Failed to update payment");
      },
    },
  );

  const handleAddClick = () => {
    setEditingPayment(null);
    setFormState({
      amount: "",
      currency: "EUR",
      paymentDate: new Date().toISOString().split("T")[0],
      method: "BankTransfer",
      reference: "",
      notes: "",
      invoiceId: "",
    });
    setShowModal(true);
  };

  const handleEditClick = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setFormState({
      amount: String(payment.amount),
      currency: payment.currency || "EUR",
      paymentDate: payment.paymentDate.split("T")[0],
      method: payment.paymentMethod || "BankTransfer",
      reference: payment.reference || "",
      notes: payment.notes || "",
      invoiceId: payment.invoiceId || "",
    });
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
    setFormError(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNumber = parseFloat(formState.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setFormError(
        t("accounting.invalidAmount") || "Please enter a valid amount",
      );
      return;
    }

    // Convert date from YYYY-MM-DD format to ISO 8601 format
    const isoDate = formState.paymentDate
      ? new Date(formState.paymentDate).toISOString()
      : new Date().toISOString();

    if (editingPayment) {
      // Update existing payment
      const input: any = {
        Id: editingPayment.id,
        Amount: amountNumber,
        Currency: formState.currency || "EUR",
        Method: formState.method,
        PaymentDate: isoDate,
        Reference: formState.reference || null,
        Notes: formState.notes || null,
      };

      if (formState.invoiceId) {
        input.InvoiceId = formState.invoiceId;
      }

      await updatePaymentRecord({ variables: { input } });
    } else {
      // Create new payment
      const input: any = {
        type: "CustomerPayment",
        amount: amountNumber,
        currency: formState.currency || "EUR",
        method: formState.method,
        paymentDate: isoDate,
        reference: formState.reference || null,
        notes: formState.notes || null,
      };

      if (formState.invoiceId) {
        input.invoiceId = formState.invoiceId;
      }

      await createPaymentRecord({ variables: { input } });
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle unavailable service
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t("common.serviceUnavailable") || "Service Unavailable"}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Payment Records data could not be loaded. This feature will be
          available when the accounting service is deployed.
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
          <h2 className="text-xl font-semibold">{t("accounting.payments")}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("accounting.paymentsSubtitle") ||
              "Record and manage payment transactions"}
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t("accounting.addPayment") || "Add Payment"}
        </button>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.paymentDate")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.amount")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.paymentMethod")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.reference")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.invoice")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {t("accounting.noPayments") || "No payment records found"}
                  </td>
                </tr>
              ) : (
                payments.map((payment: PaymentRecord) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {t(
                        `accounting.paymentMethod.${payment.paymentMethod.toLowerCase()}`,
                      ) || payment.paymentMethod}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {payment.reference || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {payment.invoice ? (
                        <span className="font-mono text-sm">
                          {payment.invoice.invoiceNumber}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(payment)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title={t("common.edit")}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment)}
                          className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                          title={t("common.delete")}
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

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold">
              {editingPayment
                ? t("accounting.editPayment") || "Edit Payment"
                : t("accounting.addPayment") || "Add Payment"}
            </h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("accounting.amount")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={formState.amount}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("accounting.currency")}
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={formState.currency}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("accounting.paymentDate")}
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formState.paymentDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("accounting.paymentMethod")}
                  </label>
                  <select
                    name="method"
                    value={formState.method}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="BankTransfer">
                      {t("accounting.paymentMethod.banktransfer") ||
                        "Bank Transfer"}
                    </option>
                    <option value="CreditCard">
                      {t("accounting.paymentMethod.creditcard") ||
                        "Credit Card"}
                    </option>
                    <option value="DebitCard">
                      {t("accounting.paymentMethod.debitcard") || "Debit Card"}
                    </option>
                    <option value="Cash">
                      {t("accounting.paymentMethod.cash") || "Cash"}
                    </option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">
                      {t("common.other") || "Other"}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("accounting.reference")}
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formState.reference}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                  placeholder={
                    t("accounting.referencePlaceholder") ||
                    "Optional reference or transaction ID"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("accounting.invoice") || "Invoice (optional)"}
                </label>
                <select
                  name="invoiceId"
                  value={formState.invoiceId}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="">
                    {t("accounting.selectInvoice") || "Select an invoice..."}
                  </option>
                  {(invoicesData?.invoices?.nodes || []).map(
                    (invoice: Invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("accounting.notes")}
                </label>
                <textarea
                  name="notes"
                  value={formState.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                  placeholder={
                    t("accounting.paymentNotesPlaceholder") ||
                    "Optional notes about this payment"
                  }
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="btn-secondary"
                  disabled={saving || updating}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || updating}
                >
                  {saving || updating
                    ? updating
                      ? t("common.updating") || "Updating..."
                      : t("common.saving") || "Saving..."
                    : editingPayment
                      ? t("common.save") || "Save"
                      : t("common.create") || "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              {t("accounting.confirmDeletePayment") || "Delete Payment Record"}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t("accounting.confirmDeletePaymentMessage", {
                amount: formatCurrency(
                  deleteConfirm.amount,
                  deleteConfirm.currency,
                ),
                date: formatDate(deleteConfirm.paymentDate),
              }) ||
                `Are you sure you want to delete this payment record of ${formatCurrency(deleteConfirm.amount, deleteConfirm.currency)} from ${formatDate(deleteConfirm.paymentDate)}? This action cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button onClick={handleConfirmDelete} className="btn-danger">
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
