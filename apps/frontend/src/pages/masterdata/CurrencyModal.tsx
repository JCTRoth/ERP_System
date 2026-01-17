import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_CURRENCY = gql`
  mutation CreateCurrency($input: CreateCurrencyInput!) {
    createCurrency(input: $input) {
      id
      code
      name
    }
  }
`;

const UPDATE_CURRENCY = gql`
  mutation UpdateCurrency($id: UUID!, $input: UpdateCurrencyInput!) {
    updateCurrency(id: $id, input: $input) {
      id
      code
      name
    }
  }
`;

export interface CurrencyData {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface CurrencyModalProps {
  currency: CurrencyData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CurrencyModal({ currency, onClose, onSuccess }: CurrencyModalProps) {
  const { t } = useI18n();
  const isEditing = !!currency;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
    exchangeRate: 1,
    isDefault: false,
  });

  const [createCurrency, { loading: createLoading }] = useMutation(CREATE_CURRENCY, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updateCurrency, { loading: updateLoading }] = useMutation(UPDATE_CURRENCY, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (currency) {
      setFormData({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || '',
        decimalPlaces: currency.decimalPlaces,
        exchangeRate: currency.exchangeRate,
        isDefault: currency.isDefault,
      });
    }
  }, [currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateCurrency({
          variables: {
            id: currency.id,
            input: {
              name: formData.name || undefined,
              symbol: formData.symbol || undefined,
              exchangeRate: formData.exchangeRate,
              isDefault: formData.isDefault,
              isActive: true, // Assuming we keep it active for now
            },
          },
        });
      } else {
        await createCurrency({
          variables: {
            input: {
              code: formData.code,
              name: formData.name,
              symbol: formData.symbol || undefined,
              decimalPlaces: formData.decimalPlaces,
              exchangeRate: formData.exchangeRate,
              isDefault: formData.isDefault,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('common.edit') + ' ' + t('masterdata.currency') : t('common.add') + ' ' + t('masterdata.currency')}
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
              placeholder="EUR"
              maxLength={10}
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
              placeholder="Euro"
            />
          </div>

          {/* Symbol and Decimal Places */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.symbol')}
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="input mt-1 w-full"
                placeholder="€"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.decimalPlaces')}
              </label>
              <input
                type="number"
                min={0}
                max={8}
                value={formData.decimalPlaces}
                onChange={(e) => setFormData({ ...formData, decimalPlaces: parseInt(e.target.value) || 2 })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.exchangeRate')} *
            </label>
            <input
              type="number"
              step="0.0001"
              required
              value={formData.exchangeRate}
              onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })}
              className="input mt-1 w-full"
              placeholder="1.0000"
            />
          </div>

          {/* Is Base Currency */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('masterdata.isDefault') || 'Is Default Currency'}
            </label>
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