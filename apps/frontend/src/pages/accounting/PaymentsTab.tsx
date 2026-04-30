import { FormEvent, useMemo, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../providers/I18nProvider";
import { useCurrency } from '../../hooks/useCurrency';

interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  category: string;
}

const GET_PAYMENT_RECORDS = gql`
  query GetPaymentRecords($first: Int, $where: PaymentRecordFilterInput) {
    paymentRecords(first: $first, where: $where, order: { paymentDate: DESC }) {
      nodes {
        id
        type
        paymentDate
        amount
        currency
        paymentMethod
        reference
        notes
        invoiceId
        accountId
        bankAccountId
        payerName
        payeeName
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

const GET_ACCOUNTS = gql`
  query GetAccounts {
    accounts(order: { accountNumber: ASC }) {
      nodes {
        id
        accountNumber
        name
        type
        category
      }
    }
  }
`;

const CREATE_PAYMENT_RECORD = gql`
  mutation CreatePaymentRecord($input: CreatePaymentRecordInput!) {
    createPaymentRecord(input: $input) {
      id
      type
      paymentDate
      amount
      currency
      paymentMethod
      reference
      notes
      invoiceId
      payerName
      payeeName
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
      accountId
      payerName
      payeeName
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
  type: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  invoiceId: string | null;
  accountId: string | null;
  bankAccountId: string | null;
  payerName: string | null;
  payeeName: string | null;
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
    type: "CustomerPayment",
    amount: "",
    currency: "EUR",
    paymentDate: new Date().toISOString().split("T")[0],
    method: "BankTransfer",
    reference: "",
    notes: "",
    invoiceId: "",
    accountId: "",
    payeeName: "",
    payerName: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const PAYMENT_TYPE_OPTIONS = ['CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT'] as const;
  const PAYMENT_METHOD_OPTIONS = [
    { value: 'BANK_TRANSFER', label: 'banktransfer' },
    { value: 'CREDIT_CARD', label: 'creditcard' },
    { value: 'DEBIT_CARD', label: 'debitcard' },
    { value: 'CASH', label: 'cash' },
    { value: 'CHECK', label: 'check' },
    { value: 'PAY_PAL', label: 'paypal' },
    { value: 'DIRECT_DEBIT', label: 'directdebit' },
    { value: 'INVOICE', label: 'invoice' },
    { value: 'OTHER', label: 'other' },
  ] as const;

  const whereFilter = useMemo(() => {
    const where: any = {};
    if (startDate) {
      where.paymentDate = { ...(where.paymentDate || {}), gte: new Date(`${startDate}T00:00:00Z`).toISOString() };
    }
    if (endDate) {
      where.paymentDate = { ...(where.paymentDate || {}), lte: new Date(`${endDate}T23:59:59Z`).toISOString() };
    }
    if (typeFilter !== 'all') {
      where.type = { eq: typeFilter };
    }
    if (methodFilter !== 'all') {
      where.method = { eq: methodFilter };
    }
    return where;
  }, [startDate, endDate, typeFilter, methodFilter]);

  const { data, loading, refetch, error } = useQuery(GET_PAYMENT_RECORDS, {
    variables: {
      first: 500,
      where: whereFilter,
    },
    errorPolicy: "all",
  });

  const { data: invoicesData } = useQuery(GET_INVOICES, {
    errorPolicy: "all",
  });

  const { data: accountsData } = useQuery(GET_ACCOUNTS, {
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
      type: "CustomerPayment",
      amount: "",
      currency: "EUR",
      paymentDate: new Date().toISOString().split("T")[0],
      method: "BankTransfer",
      reference: "",
      notes: "",
      invoiceId: "",
      accountId: "",
      payeeName: "",
      payerName: "",
    });
    setShowModal(true);
  };

  const handleEditClick = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setFormState({
      type: payment.type || "CustomerPayment",
      amount: String(payment.amount),
      currency: payment.currency || "EUR",
      paymentDate: payment.paymentDate.split("T")[0],
      method: payment.paymentMethod || "BankTransfer",
      reference: payment.reference || "",
      notes: payment.notes || "",
      invoiceId: payment.invoiceId || "",
      accountId: payment.accountId || payment.bankAccountId || "",
      payeeName: payment.payeeName || "",
      payerName: payment.payerName || "",
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
        id: editingPayment.id,
        type: formState.type,
        amount: amountNumber,
        currency: formState.currency || currencyCode,
        method: formState.method,
        paymentDate: isoDate,
        reference: formState.reference || null,
        notes: formState.notes || null,
        payerName: formState.payerName || null,
        payeeName: formState.payeeName || null,
      };

      if (formState.invoiceId) {
        input.invoiceId = formState.invoiceId;
      }

      if (formState.accountId) {
        input.accountId = formState.accountId;
      }

      await updatePaymentRecord({ variables: { input } });
    } else {
      // Create new payment
      const input: any = {
        type: formState.type,
        amount: amountNumber,
        currency: formState.currency || currencyCode,
        method: formState.method,
        paymentDate: isoDate,
        reference: formState.reference || null,
        notes: formState.notes || null,
        payerName: formState.payerName || null,
        payeeName: formState.payeeName || null,
      };

      if (formState.invoiceId) {
        input.invoiceId = formState.invoiceId;
      }

      if (formState.accountId) {
        input.accountId = formState.accountId;
      }

      await createPaymentRecord({ variables: { input } });
    }
  };

  const { formatCurrency, currencyCode, locale } = useCurrency();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
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

  const handleExport = () => {
    if (!payments.length) return;

    const header = [
      t('accounting.paymentDate') || 'Payment Date',
      t('accounting.type') || 'Type',
      t('accounting.amount') || 'Amount',
      t('accounting.currency') || 'Currency',
      t('accounting.counterparty') || 'Counterparty',
      t('accounting.paymentMethod') || 'Payment Method',
      t('accounting.reference') || 'Reference',
      t('accounting.invoice') || 'Invoice',
    ];
    const rows = payments.map((payment: PaymentRecord) => {
      const isOutgoing = payment.type === 'SUPPLIER_PAYMENT' || payment.type === 'SupplierPayment';
      return [
        formatDate(payment.paymentDate),
        isOutgoing ? (t('accounting.outgoing') || 'Outgoing') : (t('accounting.incoming') || 'Incoming'),
        isOutgoing ? -payment.amount : payment.amount,
        payment.currency,
        isOutgoing ? (payment.payeeName || '') : (payment.payerName || ''),
        payment.paymentMethod,
        payment.reference || '',
        payment.invoice?.invoiceNumber || '',
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Filters & Export */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.from') || 'From'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.to') || 'To'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.paymentDirection') || 'Direction'}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('common.all') || 'All'}</option>
              {PAYMENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === 'CUSTOMER_PAYMENT'
                    ? (t('accounting.incoming') || 'Incoming')
                    : (t('accounting.outgoing') || 'Outgoing')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.paymentMethod') || 'Method'}
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('common.all') || 'All'}</option>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method.value} value={method.value}>
                  {t(`accounting.paymentMethod.${method.label}`) || method.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2"
          disabled={!payments.length}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {t('accounting.exportCsv') || 'Export CSV'}
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
                  {t("accounting.type")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.amount")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t("accounting.counterparty") || "Counterparty"}
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
                  <td colSpan={8} className="px-6 py-4 text-center">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {t("accounting.noPayments") || "No payment records found"}
                  </td>
                </tr>
              ) : (
                payments.map((payment: PaymentRecord) => {
                  const isOutgoing = payment.type === "SUPPLIER_PAYMENT" || payment.type === "SupplierPayment";
                  return (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isOutgoing
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {isOutgoing
                          ? <><ArrowUpTrayIcon className="h-3 w-3" />{t("accounting.outgoing") || "Outgoing"}</>
                          : <><ArrowDownTrayIcon className="h-3 w-3" />{t("accounting.incoming") || "Incoming"}</>
                        }
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 font-medium ${isOutgoing ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {isOutgoing ? '- ' : ''}{formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {isOutgoing
                        ? payment.payeeName || '-'
                        : payment.payerName || '-'
                      }
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
                  );
                })
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
              {/* Payment Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("accounting.paymentDirection") || "Payment Direction"}
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, type: "CustomerPayment" }))}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formState.type === "CustomerPayment"
                        ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-400"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {t("accounting.incoming") || "Incoming"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, type: "SupplierPayment" }))}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formState.type === "SupplierPayment"
                        ? "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-400"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    {t("accounting.outgoing") || "Outgoing"}
                  </button>
                </div>
              </div>

              {/* Payer / Payee Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formState.type === "SupplierPayment"
                    ? (t("accounting.payeeName") || "Payee / Supplier Name")
                    : (t("accounting.payerName") || "Payer / Customer Name")
                  }
                </label>
                <input
                  type="text"
                  name={formState.type === "SupplierPayment" ? "payeeName" : "payerName"}
                  value={formState.type === "SupplierPayment" ? formState.payeeName : formState.payerName}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                  placeholder={
                    formState.type === "SupplierPayment"
                      ? (t("accounting.payeeNamePlaceholder") || "Supplier or vendor name")
                      : (t("accounting.payerNamePlaceholder") || "Customer name")
                  }
                />
              </div>

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
                  {t("accounting.account") || "Account"}
                </label>
                <select
                  name="accountId"
                  value={formState.accountId}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="">
                    {t("accounting.selectAccount") || "Select an account..."}
                  </option>
                  {(accountsData?.accounts?.nodes || []).map(
                    (account: Account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber} - {account.name}
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
              }) || (
                `Are you sure you want to delete this payment record of ${formatCurrency(deleteConfirm.amount, deleteConfirm.currency)} from ${formatDate(deleteConfirm.paymentDate)}? This action cannot be undone.`
              )}
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
