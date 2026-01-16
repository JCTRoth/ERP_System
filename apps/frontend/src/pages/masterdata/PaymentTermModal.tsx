import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_PAYMENT_TERM = gql`
  mutation CreatePaymentTerm($input: CreatePaymentTermInput!) {
    createPaymentTerm(input: $input) {
      id
      code
      name
    }
  }
`;

const UPDATE_PAYMENT_TERM = gql`
  mutation UpdatePaymentTerm($id: UUID!, $input: UpdatePaymentTermInput!) {
    updatePaymentTerm(id: $id, input: $input) {
      id
      code
      name
    }
  }
`;

export interface PaymentTermData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  dueDays: number;
  discountDays: number | null;
  discountPercent: number | null;
  isActive: boolean;
}

interface PaymentTermModalProps {
  paymentTerm: PaymentTermData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaymentTermModal({ paymentTerm, onClose, onSuccess }: PaymentTermModalProps) {
  const { t } = useI18n();
  const isEditing = !!paymentTerm;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'Net',
    dueDays: 30,
    discountPercent: 0,
    discountDays: 0,
  });

  const [createPaymentTerm, { loading: createLoading }] = useMutation(CREATE_PAYMENT_TERM, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updatePaymentTerm, { loading: updateLoading }] = useMutation(UPDATE_PAYMENT_TERM, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (paymentTerm) {
      setFormData({
        code: paymentTerm.code,
        name: paymentTerm.name,
        description: paymentTerm.description || '',
        type: paymentTerm.type || 'Net',
        dueDays: paymentTerm.dueDays,
        discountPercent: paymentTerm.discountPercent || 0,
        discountDays: paymentTerm.discountDays || 0,
      });
    }
  }, [paymentTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updatePaymentTerm({
          variables: {
            id: paymentTerm.id,
            input: {
              name: formData.name || undefined,
              description: formData.description || undefined,
              dueDays: formData.dueDays,
              discountPercent: formData.discountPercent || undefined,
              discountDays: formData.discountDays || undefined,
              isActive: true, // Assuming we keep it active for now
            },
          },
        });
      } else {
        await createPaymentTerm({
          variables: {
            input: {
              code: formData.code,
              name: formData.name,
              description: formData.description || undefined,
              dueDays: formData.dueDays,
              discountPercent: formData.discountPercent || undefined,
              discountDays: formData.discountDays || undefined,
              type: formData.type,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error saving payment term:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('common.edit') + ' ' + t('masterdata.paymentTerms') : t('common.add') + ' ' + t('masterdata.paymentTerms')}
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
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.code')} *
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input mt-1 w-full"
              placeholder="NET30"
              maxLength={50}
            />
          </div>

          {/* Name */}
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
              placeholder="Net 30 Days"
            />
          </div>

          {/* Type and Due Days */}
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
                <option value="Net">{t('masterdata.paymentTermType.net') || 'Net'}</option>
                <option value="DueOnReceipt">{t('masterdata.paymentTermType.dueOnReceipt') || 'Due on Receipt'}</option>
                <option value="EndOfMonth">{t('masterdata.paymentTermType.endOfMonth') || 'End of Month'}</option>
                <option value="EndOfNextMonth">{t('masterdata.paymentTermType.endOfNextMonth') || 'End of Next Month'}</option>
                <option value="Custom">{t('masterdata.paymentTermType.custom') || 'Custom'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.dueDays')} *
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.dueDays}
                onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 0 })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Discount Percent and Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.discountPercent')} (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                className="input mt-1 w-full"
                placeholder="2.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.discountDays')}
              </label>
              <input
                type="number"
                min={0}
                value={formData.discountDays}
                onChange={(e) => setFormData({ ...formData, discountDays: parseInt(e.target.value) || 0 })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('common.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input mt-1 w-full"
              rows={2}
              placeholder="Payment terms description..."
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