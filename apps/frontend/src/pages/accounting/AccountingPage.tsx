import { useState } from 'react';
import {
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import InvoicesTab from './InvoicesTab';
import PaymentsTab from './PaymentsTab';
import AccountsTab from './AccountsTab';
import BookingsTab from './BookingsTab';

type Tab = 'invoices' | 'payments' | 'accounts' | 'bookings';

const TABS: { key: Tab; labelKey: string; icon: typeof DocumentTextIcon }[] = [
  { key: 'invoices', labelKey: 'accounting.invoices', icon: DocumentTextIcon },
  { key: 'payments', labelKey: 'accounting.payments', icon: CreditCardIcon },
  { key: 'accounts', labelKey: 'accounting.chartOfAccounts', icon: BanknotesIcon },
  { key: 'bookings', labelKey: 'accounting.bookings', icon: ClipboardDocumentListIcon },
];

export default function AccountingPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('invoices');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('accounting.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('accounting.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'bookings' && <BookingsTab />}
      </div>
    </div>
  );
}
