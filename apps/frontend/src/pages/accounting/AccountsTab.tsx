import { useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import {
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { AccountModal } from './AccountModal';

const GET_ACCOUNTS = gql`
  query GetAccounts {
    accounts(order: { accountNumber: ASC }) {
      nodes {
        id
        accountNumber
        name
        type
        category
        parentAccountId
        balance
        isActive
        isSystemAccount
        description
      }
      totalCount
    }
  }
`;

const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id
      accountNumber
      name
      type
      category
      balance
      isActive
      description
    }
  }
`;

const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: UUID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      id
      accountNumber
      name
      type
      category
      balance
      isActive
      description
    }
  }
`;

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

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  LIABILITY: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
  EQUITY: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
  REVENUE: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
  EXPENSE: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30',
};

export default function AccountsTab() {
  const { t } = useI18n();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    account: Account | null;
  }>({
    isOpen: false,
    mode: 'create',
    account: null,
  });

  const { data, loading, error, refetch } = useQuery(GET_ACCOUNTS, {
    errorPolicy: 'all',
  });

  const [createAccount] = useMutation(CREATE_ACCOUNT, {
    onCompleted: () => {
      refetch();
      setModalState({ isOpen: false, mode: 'create', account: null });
    },
  });

  const [updateAccount] = useMutation(UPDATE_ACCOUNT, {
    onCompleted: () => {
      refetch();
      setModalState({ isOpen: false, mode: 'create', account: null });
    },
  });

  const handleCreateAccount = (accountData: any) => {
    createAccount({
      variables: {
        input: accountData,
      },
    });
  };

  const handleEditAccount = (account: Account) => {
    setModalState({ isOpen: true, mode: 'edit', account });
  };

  const handleUpdateAccount = (accountData: any) => {
    if (modalState.account) {
      updateAccount({
        variables: {
          id: modalState.account.id,
          input: accountData,
        },
      });
    }
  };

  const getAccountDisplayName = (account: Account): string => {
    if (account.isSystemAccount) {
      // For system accounts, use translated names based on category
      switch (account.category) {
        case 'CASH':
          return t('accounting.accountName.cash');
        case 'BANK_ACCOUNT':
          return t('accounting.accountName.bankAccount');
        case 'ACCOUNTS_RECEIVABLE':
          return t('accounting.accountName.accountsReceivable');
        case 'ACCOUNTS_PAYABLE':
          return t('accounting.accountName.accountsPayable');
        case 'SalesInvoice':
          return t('accounting.accountName.salesRevenue');
        case 'COST_OF_GOODS_SOLD':
          return t('accounting.accountName.costOfGoodsSold');
        case 'OPERATING_EXPENSES':
          return t('accounting.accountName.operatingExpenses');
        default:
          return account.name;
      }
    }
    return account.name;
  };

  // Handle unavailable service
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Chart of Accounts data could not be loaded. This feature will be available when the accounting service is deployed.
        </p>
      </div>
    );
  }

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Group accounts by type
  const accountsByType = data?.accounts?.nodes?.reduce(
    (acc: Record<string, Account[]>, account: Account) => {
      if (!acc[account.type]) {
        acc[account.type] = [];
      }
      acc[account.type].push(account);
      return acc;
    },
    {}
  ) || {};

  const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  // Calculate totals by type
  const typeTotals = accountTypes.reduce((acc, type) => {
    acc[type] = accountsByType[type]?.reduce(
      (sum: number, account: Account) => sum + account.balance,
      0
    ) || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('accounting.allAccountTypes')}</option>
            <option value="ASSET">{t('accounting.accountType.asset')}</option>
            <option value="LIABILITY">{t('accounting.accountType.liability')}</option>
            <option value="EQUITY">{t('accounting.accountType.equity')}</option>
            <option value="REVENUE">{t('accounting.accountType.revenue')}</option>
            <option value="EXPENSE">{t('accounting.accountType.expense')}</option>
          </select>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setModalState({ isOpen: true, mode: 'create', account: null })}
        >
          <PlusIcon className="h-5 w-5" />
          {t('accounting.addAccount')}
        </button>
      </div>

      {/* Account Tree */}
      {loading ? (
        <div className="card p-6 text-center">{t('common.loading')}</div>
      ) : (
        <div className="space-y-4">
          {accountTypes
            .filter((type) => typeFilter === 'all' || typeFilter === type)
            .map((type) => (
              <div key={type} className="card overflow-hidden">
                {/* Type Header */}
                <button
                  onClick={() => toggleType(type)}
                  className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center gap-3">
                    {expandedTypes.has(type) ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                    <FolderIcon className="h-5 w-5" />
                    <span className="font-semibold">
                      {t(`accounting.accountType.${type.toLowerCase()}`)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACCOUNT_TYPE_COLORS[type]
                      }`}
                    >
                      {accountsByType[type]?.length || 0} {t('accounting.accounts')}
                    </span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(typeTotals[type] || 0)}
                  </span>
                </button>

                {/* Accounts List */}
                {expandedTypes.has(type) && accountsByType[type] && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {accountsByType[type].map((account: Account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-20 font-mono text-sm text-gray-500">
                            {account.accountNumber}
                          </span>
                          <div>
                            <p className="font-medium">{getAccountDisplayName(account)}</p>
                            {account.description && (
                              <p className="text-sm text-gray-500">{account.description}</p>
                            )}
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              account.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {account.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p
                            className={`font-medium ${
                              account.balance < 0 ? 'text-red-600' : ''
                            }`}
                          >
                            {formatCurrency(account.balance)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t(`accounting.category.${account.category.toLowerCase()}`)}
                          </p>
                          <button
                            onClick={() => handleEditAccount(account)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* Summary */}
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">{t('accounting.accountingSummary')}</h3>
            <div className="grid grid-cols-5 gap-4">
              {accountTypes.map((type) => (
                <div key={type} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <p className="text-sm text-gray-500">
                    {t(`accounting.accountType.${type.toLowerCase()}`)}
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(typeTotals[type] || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <AccountModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        account={modalState.account}
        onClose={() => setModalState({ isOpen: false, mode: 'create', account: null })}
        onSave={modalState.mode === 'create' ? handleCreateAccount : handleUpdateAccount}
      />
    </div>
  );
}
