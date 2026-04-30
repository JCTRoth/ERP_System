import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  XMarkIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useCurrency } from '../../hooks/useCurrency';

const GET_ACCOUNT_STATEMENT = gql`
  query GetAccountStatement($accountId: UUID!, $from: DateTime!, $to: DateTime!) {
    accountStatement(accountId: $accountId, from: $from, to: $to) {
      accountId
      accountNumber
      accountName
      accountType
      fromDate
      toDate
      openingBalance
      closingBalance
      totalDebit
      totalCredit
      transactions {
        date
        entryNumber
        description
        debitAmount
        creditAmount
        runningBalance
      }
    }
  }
`;

interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
}

interface AccountTransactionsModalProps {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onEdit: () => void;
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  return {
    from: `${year}-01-01`,
    to: now.toISOString().split('T')[0],
  };
}

export function AccountTransactionsModal({
  isOpen,
  account,
  onClose,
  onEdit,
}: AccountTransactionsModalProps) {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();
  useEscapeKey(onClose, isOpen);

  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const { data, loading, error, refetch } = useQuery(GET_ACCOUNT_STATEMENT, {
    variables: {
      accountId: account?.id,
      from: `${fromDate}T00:00:00Z`,
      to: `${toDate}T23:59:59Z`,
    },
    skip: !isOpen || !account,
    fetchPolicy: 'network-only',
  });

  if (!isOpen || !account) return null;

  const statement = data?.accountStatement;
  const transactions = statement?.transactions ?? [];

  const navigatePeriod = (direction: number) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffMs = to.getTime() - from.getTime();
    const newFrom = new Date(from.getTime() + direction * (diffMs + 86400000));
    const newTo = new Date(to.getTime() + direction * (diffMs + 86400000));
    setFromDate(newFrom.toISOString().split('T')[0]);
    setToDate(newTo.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">
              {account.accountNumber} – {account.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('accounting.transactionHistory')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="btn-secondary text-sm"
            >
              {t('common.edit')}
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Date range controls */}
        <div className="flex items-center gap-3 border-b px-6 py-3 dark:border-gray-700">
          <button
            onClick={() => navigatePeriod(-1)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('common.previous')}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">{t('common.from')}:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">{t('common.to')}:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input text-sm"
            />
          </div>
          <button
            onClick={() => navigatePeriod(1)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('common.next')}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => refetch()}
            className="ml-auto rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Summary */}
        {statement && (
          <div className="grid grid-cols-4 gap-4 border-b px-6 py-3 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500">{t('accounting.openingBalance')}</p>
              <p className="font-semibold">{formatCurrency(statement.openingBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('accounting.totalDebit')}</p>
              <p className="font-semibold text-blue-600">{formatCurrency(statement.totalDebit)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('accounting.totalCredit')}</p>
              <p className="font-semibold text-red-600">{formatCurrency(statement.totalCredit)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('accounting.closingBalance')}</p>
              <p className="font-bold">{formatCurrency(statement.closingBalance)}</p>
            </div>
          </div>
        )}

        {/* Transactions table */}
        <div className="max-h-[50vh] overflow-auto px-6 py-4">
          {loading ? (
            <div className="py-8 text-center text-gray-500">{t('common.loading')}</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">
              {t('common.error')}: {error.message}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t('accounting.noTransactions')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('accounting.date')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('accounting.entryNumber')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('accounting.description')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('accounting.debit')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('accounting.credit')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('accounting.balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {/* Opening balance row */}
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-3 py-2 font-medium" colSpan={5}>
                    {t('accounting.openingBalance')}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(statement?.openingBalance ?? 0)}
                  </td>
                </tr>
                {transactions.map((tx: any, i: number) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-500">
                      {tx.entryNumber}
                    </td>
                    <td className="px-3 py-2">{tx.description}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {tx.debitAmount > 0 ? formatCurrency(tx.debitAmount) : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {tx.creditAmount > 0 ? formatCurrency(tx.creditAmount) : ''}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                        tx.runningBalance < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {formatCurrency(tx.runningBalance)}
                    </td>
                  </tr>
                ))}
                {/* Closing balance row */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold dark:border-gray-600 dark:bg-gray-700/50">
                  <td className="px-3 py-2" colSpan={3}>
                    {t('accounting.closingBalance')}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-600">
                    {formatCurrency(statement?.totalDebit ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {formatCurrency(statement?.totalCredit ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(statement?.closingBalance ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t px-6 py-3 text-sm text-gray-500 dark:border-gray-700">
          <span>
            {transactions.length} {t('accounting.transactions')}
          </span>
          <span>
            {t('accounting.netMovement')}:{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {statement
                ? formatCurrency(statement.closingBalance - statement.openingBalance)
                : '–'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
