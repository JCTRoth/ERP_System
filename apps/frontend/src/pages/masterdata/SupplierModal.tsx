import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import Tooltip from '../../components/Tooltip';

const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
      id
      code
      name
    }
  }
`;

const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($id: UUID!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
      code
      name
    }
  }
`;

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  vatNumber: string | null;
  leadTimeDays: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface SupplierModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SupplierModal({ supplier, onClose, onSuccess }: SupplierModalProps) {
  const { t } = useI18n();
  const isEditing = !!supplier;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    vatNumber: '',
    leadTimeDays: 14,
    currency: 'USD',
    isActive: true,
    notes: '',
  });

  const [createSupplier, { loading: createLoading, error: createError }] = useMutation(CREATE_SUPPLIER, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updateSupplier, { loading: updateLoading, error: updateError }] = useMutation(UPDATE_SUPPLIER, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        code: supplier.code || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        postalCode: supplier.postalCode || '',
        country: supplier.country || '',
        vatNumber: supplier.vatNumber || '',
        leadTimeDays: supplier.leadTimeDays,
        currency: supplier.currency,
        isActive: supplier.isActive,
        notes: '',
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if service is available
    if (createError?.message.includes('Unknown type') || updateError?.message.includes('Unknown type')) {
      alert('The Suppliers service is not yet available. This feature will be enabled when the masterdata service is deployed.');
      return;
    }

    try {
      const input = {
        name: formData.name,
        code: formData.code || null,
        contactPerson: formData.contactPerson || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        country: formData.country || null,
        vatNumber: formData.vatNumber || null,
        leadTimeDays: formData.leadTimeDays,
        currency: formData.currency,
        notes: formData.notes || null,
      };

      if (isEditing) {
        await updateSupplier({
          variables: { id: supplier.id, input: { ...input, isActive: formData.isActive } },
        });
      } else {
        await createSupplier({ variables: { input } });
      }
    } catch (error) {
      // Silently handle errors for unavailable services
      if ((error as Error).message.includes('Unknown type')) {
        return;
      }
      console.error('Error saving supplier:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('masterdata.editSupplier') : t('masterdata.addSupplier')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Code */}
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
                placeholder={t('masterdata.supplierNamePlaceholder') || 'Enter supplier name'}
              />
            </div>
            <div>
              <Tooltip content={t('masterdata.codeTooltip') || 'Unique identifier for the supplier'} position="top">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('masterdata.code')}
                </label>
              </Tooltip>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="input mt-1 w-full"
                placeholder="SUP-001"
              />
            </div>
          </div>

          {/* Contact Person and Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.contactPerson')}
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
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
          </div>

          {/* Phone */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Tooltip content={t('masterdata.vatNumberTooltip') || 'VAT/Tax identification number'} position="top">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('masterdata.vatNumber')}
                </label>
              </Tooltip>
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.address')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input mt-1 w-full"
            />
          </div>

          {/* City, Postal Code, Country */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.city')}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.postalCode')}
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.country')}
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Lead Time, Currency, Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Tooltip content={t('masterdata.leadTimeTooltip') || 'Average delivery time in days'} position="top">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('masterdata.leadTime')} ({t('common.days')})
                </label>
              </Tooltip>
              <input
                type="number"
                min="0"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
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
                <option value="CHF">CHF</option>
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.status')}
                </label>
                <select
                  value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'ACTIVE' })}
                  className="input mt-1 w-full"
                >
                  <option value="ACTIVE">{t('common.active')}</option>
                  <option value="INACTIVE">{t('common.inactive')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input mt-1 w-full"
              rows={3}
              placeholder={t('masterdata.notesPlaceholder') || 'Additional notes about this supplier...'}
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
              aria-label={isEditing ? t('masterdata.updateSupplierTooltip') : t('masterdata.createSupplierTooltip')}
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
