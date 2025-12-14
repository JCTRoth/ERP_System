import { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
    }
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

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  accountId: string;
  taxRate: number;
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
    type: 'SALES',
    customerId: '',
    customerName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, accountId: '', taxRate: 0 },
  ]);

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const [createInvoice, { loading }] = useMutation(CREATE_INVOICE);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, accountId: '', taxRate: 0 },
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
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0
  );
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createInvoice({
        variables: {
          input: {
            type: formData.type,
            customerId: formData.customerId || null,
            customerName: formData.customerName,
            invoiceDate: formData.invoiceDate,
            dueDate: formData.dueDate,
            currency: formData.currency,
            notes: formData.notes || null,
            lineItems: lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              accountId: item.accountId || null,
              taxRate: item.taxRate,
            })),
          },
        },
      });
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
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
                <option value="SALES">{t('accounting.salesInvoice')}</option>
                <option value="PURCHASE">{t('accounting.purchaseInvoice')}</option>
                <option value="CREDIT_NOTE">{t('accounting.creditNote')}</option>
                <option value="DEBIT_NOTE">{t('accounting.debitNote')}</option>
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
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="input mt-1 w-full"
              />
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

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="col-span-4">
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
                      className="input w-full"
                    >
                      <option value="">{t('accounting.selectAccount')}</option>
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
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('accounting.price')}
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, { unitPrice: parseFloat(e.target.value) })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={t('accounting.tax')}
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, { taxRate: parseFloat(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <span className="font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      disabled={lineItems.length === 1}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
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
