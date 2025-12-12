import { useState } from 'react';
import {
  UsersIcon,
  TruckIcon,
  UserGroupIcon,
  CubeIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import CustomersTab from './CustomersTab';
import SuppliersTab from './SuppliersTab';
import EmployeesTab from './EmployeesTab';
import AssetsTab from './AssetsTab';
import ReferenceDataTab from './ReferenceDataTab';

type Tab = 'customers' | 'suppliers' | 'employees' | 'assets' | 'reference';

const TABS: { key: Tab; labelKey: string; icon: typeof UsersIcon }[] = [
  { key: 'customers', labelKey: 'masterdata.customers', icon: UsersIcon },
  { key: 'suppliers', labelKey: 'masterdata.suppliers', icon: TruckIcon },
  { key: 'employees', labelKey: 'masterdata.employees', icon: UserGroupIcon },
  { key: 'assets', labelKey: 'masterdata.assets', icon: CubeIcon },
  { key: 'reference', labelKey: 'masterdata.referenceData', icon: CogIcon },
];

export default function MasterdataPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('customers');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('masterdata.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('masterdata.subtitle')}
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
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'assets' && <AssetsTab />}
        {activeTab === 'reference' && <ReferenceDataTab />}
      </div>
    </div>
  );
}
