import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  category: string;
  parentAccountId: string | null;
  balance: number;
  isActive: boolean;
  isSystemAccount: boolean;
  description: string;
}

interface AccountModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  account: Account | null;
  onClose: () => void;
  onSave: (accountData: any) => void;
}

export function AccountModal({ isOpen, mode, account, onClose, onSave }: AccountModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    accountNumber: '',
    name: '',
    type: 'ASSET',
    category: 'CURRENT',
    parentAccountId: '',
    currency: 'USD',
    isActive: true,
    description: '',
  });

  useEffect(() => {
    if (mode === 'edit' && account) {
      setFormData({
        accountNumber: account.accountNumber,
        name: account.name,
        type: account.type,
        category: account.category,
        parentAccountId: account.parentAccountId || '',
        currency: 'USD', // Default for edit, since UpdateAccountInput doesn't include currency
        isActive: account.isActive,
        description: account.description || '',
      });
    } else if (mode === 'create') {
      setFormData({
        accountNumber: '',
        name: '',
        type: 'ASSET',
        category: 'CASH',
        parentAccountId: '',
        currency: 'USD',
        isActive: true,
        description: '',
      });
    }
  }, [mode, account, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? t('accounting.createAccount') : t('accounting.editAccount')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accounting.accountNumber')} *
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accounting.accountName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accounting.accountType')} *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
            >
              <option value="ASSET">{t('accounting.accountType.asset')}</option>
              <option value="LIABILITY">{t('accounting.accountType.liability')}</option>
              <option value="EQUITY">{t('accounting.accountType.equity')}</option>
              <option value="REVENUE">{t('accounting.accountType.revenue')}</option>
              <option value="EXPENSE">{t('accounting.accountType.expense')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accounting.category')} *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              required
            >
              <option value="CASH">Cash</option>
              <option value="BANK_ACCOUNT">Bank Account</option>
              <option value="ACCOUNTS_RECEIVABLE">Accounts Receivable</option>
              <option value="INVENTORY">Inventory</option>
            </select>
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('accounting.currency')} *
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                required
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accounting.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm">
              {t('common.active')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
            >
              {mode === 'create' ? t('common.create') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}