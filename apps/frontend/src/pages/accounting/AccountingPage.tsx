import { useState } from 'react';
import {
  DocumentTextIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import InvoicesTab from './InvoicesTab';
import PaymentsTab from './PaymentsTab';
import AccountsTab from './AccountsTab';
import JournalEntriesTab from './JournalEntriesTab';
import ReportsTab from './ReportsTab';

type Tab = 'invoices' | 'payments' | 'accounts' | 'journal' | 'reports';

const TABS: { key: Tab; labelKey: string; icon: typeof DocumentTextIcon }[] = [
  { key: 'invoices', labelKey: 'accounting.invoices', icon: DocumentTextIcon },
  { key: 'payments', labelKey: 'accounting.payments', icon: CreditCardIcon },
  { key: 'accounts', labelKey: 'accounting.chartOfAccounts', icon: BanknotesIcon },
  { key: 'journal', labelKey: 'accounting.journalEntries', icon: ReceiptPercentIcon },
  { key: 'reports', labelKey: 'accounting.reports', icon: ChartBarIcon },
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
        {activeTab === 'journal' && <JournalEntriesTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
