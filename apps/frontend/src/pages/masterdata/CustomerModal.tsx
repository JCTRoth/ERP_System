import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      customerNumber
    }
  }
`;

const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: UUID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      customerNumber
    }
  }
`;

interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  legalName: string;
  type: string;
  status: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  creditLimit: number;
  paymentTermDays: number;
  currency: string;
}

interface CustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerModal({ customer, onClose }: CustomerModalProps) {
  const { t } = useI18n();
  const isEditing = !!customer;

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    type: 'COMPANY',
    email: '',
    phone: '',
    website: '',
    taxId: '',
    creditLimit: 0,
    paymentTermDays: 30,
    currency: 'USD',
    status: 'ACTIVE',
    notes: '',
  });

  const [createCustomer, { loading: createLoading, error: createError }] = useMutation(CREATE_CUSTOMER, {
    errorPolicy: 'all',
  });
  const [updateCustomer, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_CUSTOMER, {
    errorPolicy: 'all',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        legalName: customer.legalName || '',
        type: customer.type || 'COMPANY',
        email: customer.email || '',
        phone: customer.phone || '',
        website: customer.website || '',
        taxId: customer.taxId || '',
        creditLimit: customer.creditLimit || 0,
        paymentTermDays: customer.paymentTermDays || 30,
        currency: customer.currency || 'USD',
        status: customer.status || 'ACTIVE',
        notes: '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        legalName: '',
        type: 'COMPANY',
        email: '',
        phone: '',
        website: '',
        taxId: '',
        creditLimit: 0,
        paymentTermDays: 30,
        currency: 'USD',
        status: 'ACTIVE',
        notes: '',
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if service is available
    if (createError?.message.includes('Unknown type') || updateError?.message.includes('Unknown type')) {
      alert('The Customers service is not yet available. This feature will be enabled when the masterdata service is deployed.');
      return;
    }

    try {
      const input = {
        name: formData.name,
        legalName: formData.legalName || null,
        type: formData.type,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        taxId: formData.taxId || null,
        creditLimit: formData.creditLimit,
        paymentTermDays: formData.paymentTermDays,
        currency: formData.currency,
        notes: formData.notes || null,
      };

      if (isEditing) {
        await updateCustomer({
          variables: { id: customer.id, input: { ...input, status: formData.status } },
        });
      } else {
        await createCustomer({ variables: { input } });
      }
      onClose();
    } catch (error) {
      // Silently handle errors for unavailable services
      if ((error as Error).message.includes('Unknown type')) {
        return;
      }
      console.error('Error saving customer:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('masterdata.editCustomer') : t('masterdata.addCustomer')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.name')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.legalName')}
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.type')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="COMPANY">{t('masterdata.customerType.company')}</option>
                <option value="INDIVIDUAL">{t('masterdata.customerType.individual')}</option>
                <option value="GOVERNMENT">{t('masterdata.customerType.government')}</option>
                <option value="NON_PROFIT">{t('masterdata.customerType.non_profit')}</option>
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input mt-1 w-full"
                >
                  <option value="ACTIVE">{t('common.active')}</option>
                  <option value="INACTIVE">{t('common.inactive')}</option>
                  <option value="ON_HOLD">{t('masterdata.onHold')}</option>
                  <option value="BLOCKED">{t('masterdata.blocked')}</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.website')}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.taxId')}
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.creditLimit')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.paymentTerms')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.paymentTermDays}
                onChange={(e) => setFormData({ ...formData, paymentTermDays: parseInt(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.currency')}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.notes')}
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
