import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  DocumentArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const GET_BALANCE_SHEET = gql`
  query GetBalanceSheet($asOfDate: DateTime!) {
    balanceSheet(asOfDate: $asOfDate) {
      asOfDate
      assets {
        current {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        nonCurrent {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        totalCurrent
        totalNonCurrent
        total
      }
      liabilities {
        current {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        nonCurrent {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        totalCurrent
        totalNonCurrent
        total
      }
      equity {
        items {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        retainedEarnings
        total
      }
      totalLiabilitiesAndEquity
    }
  }
`;

const GET_INCOME_STATEMENT = gql`
  query GetIncomeStatement($startDate: DateTime!, $endDate: DateTime!) {
    incomeStatement(startDate: $startDate, endDate: $endDate) {
      periodStart
      periodEnd
      revenue {
        items {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        total
      }
      expenses {
        items {
          accountId
          accountNumber
          accountName
          category
          isSystemAccount
          balance
        }
        total
      }
      grossProfit
      operatingIncome
      netIncome
    }
  }
`;

type ReportType = 'balance-sheet' | 'income-statement' | 'trial-balance' | 'cash-flow' | 'aging';

export default function ReportsTab() {
  const { t } = useI18n();
  const [selectedReport, setSelectedReport] = useState<ReportType>('balance-sheet');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: balanceSheetData, loading: bsLoading, error: bsError } = useQuery(GET_BALANCE_SHEET, {
    variables: { asOfDate: asOfDate + 'T23:59:59Z' },
    skip: selectedReport !== 'balance-sheet',
    errorPolicy: 'all',
  });

  const { data: incomeStatementData, loading: isLoading, error: isError } = useQuery(GET_INCOME_STATEMENT, {
    variables: {
      startDate: startDate + 'T00:00:00Z',
      endDate: endDate + 'T23:59:59Z',
    },
    skip: selectedReport !== 'income-statement',
    errorPolicy: 'all',
  });

  const getAccountDisplayName = (item: { accountName: string; category: string; isSystemAccount: boolean }): string => {
    if (item.isSystemAccount) {
      // For system accounts, use translated names based on category
      switch (item.category) {
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
          return item.accountName;
      }
    }
    return item.accountName;
  };

  // Handle unavailable service
  if (bsError || isError) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Financial Reports data could not be loaded. This feature will be available when the accounting service is deployed.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const reports = [
    { key: 'balance-sheet', labelKey: 'accounting.reports.balanceSheet' },
    { key: 'income-statement', labelKey: 'accounting.reports.incomeStatement' },
    { key: 'trial-balance', labelKey: 'accounting.reports.trialBalance' },
    { key: 'cash-flow', labelKey: 'accounting.reports.cashFlow' },
    { key: 'aging', labelKey: 'accounting.reports.aging' },
  ];

  const loading = bsLoading || isLoading;

  return (
    <div>
      {/* Report Selection */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {reports.map((report) => (
            <button
              key={report.key}
              onClick={() => setSelectedReport(report.key as ReportType)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedReport === report.key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t(report.labelKey)}
            </button>
          ))}
        </div>

        <button className="btn-secondary flex items-center gap-2">
          <DocumentArrowDownIcon className="h-5 w-5" />
          {t('accounting.exportPdf')}
        </button>
      </div>

      {/* Date Selection */}
      <div className="mb-6 flex items-center gap-4">
        <CalendarIcon className="h-5 w-5 text-gray-400" />
        {selectedReport === 'balance-sheet' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('accounting.asOfDate')}:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="input"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('accounting.period')}:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="card p-8 text-center">{t('common.loading')}</div>
      ) : (
        <>
          {/* Balance Sheet */}
          {selectedReport === 'balance-sheet' && balanceSheetData?.balanceSheet && (
            <div className="grid grid-cols-2 gap-6">
              {/* Assets */}
              <div className="card">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">{t('accounting.assets')}</h3>
                </div>
                <div className="p-6">
                  {/* Current Assets */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-500">
                      {t('accounting.currentAssets')}
                    </h4>
                    <div className="space-y-2">
                      {balanceSheetData.balanceSheet.assets.current.map((item: {
                        accountId: string;
                        accountNumber: string;
                        accountName: string;
                        category: string;
                        isSystemAccount: boolean;
                        balance: number;
                      }) => (
                        <div key={item.accountId} className="flex justify-between text-sm">
                          <span>{getAccountDisplayName(item)}</span>
                          <span>{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>{t('accounting.totalCurrentAssets')}</span>
                        <span>{formatCurrency(balanceSheetData.balanceSheet.assets.totalCurrent)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Non-Current Assets */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-500">
                      {t('accounting.nonCurrentAssets')}
                    </h4>
                    <div className="space-y-2">
                      {balanceSheetData.balanceSheet.assets.nonCurrent.map((item: {
                        accountId: string;
                        accountNumber: string;
                        accountName: string;
                        category: string;
                        isSystemAccount: boolean;
                        balance: number;
                      }) => (
                        <div key={item.accountId} className="flex justify-between text-sm">
                          <span>{getAccountDisplayName(item)}</span>
                          <span>{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>{t('accounting.totalNonCurrentAssets')}</span>
                        <span>{formatCurrency(balanceSheetData.balanceSheet.assets.totalNonCurrent)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Assets */}
                  <div className="flex justify-between rounded-lg bg-primary-50 p-3 text-lg font-bold dark:bg-primary-900/30">
                    <span>{t('accounting.totalAssets')}</span>
                    <span>{formatCurrency(balanceSheetData.balanceSheet.assets.total)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="card">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">{t('accounting.liabilitiesAndEquity')}</h3>
                </div>
                <div className="p-6">
                  {/* Current Liabilities */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-500">
                      {t('accounting.currentLiabilities')}
                    </h4>
                    <div className="space-y-2">
                      {balanceSheetData.balanceSheet.liabilities.current.map((item: {
                        accountId: string;
                        accountNumber: string;
                        accountName: string;
                        category: string;
                        isSystemAccount: boolean;
                        balance: number;
                      }) => (
                        <div key={item.accountId} className="flex justify-between text-sm">
                          <span>{getAccountDisplayName(item)}</span>
                          <span>{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>{t('accounting.totalCurrentLiabilities')}</span>
                        <span>{formatCurrency(balanceSheetData.balanceSheet.liabilities.totalCurrent)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-500">
                      {t('accounting.equity')}
                    </h4>
                    <div className="space-y-2">
                      {balanceSheetData.balanceSheet.equity.items.map((item: {
                        accountId: string;
                        accountNumber: string;
                        accountName: string;
                        category: string;
                        isSystemAccount: boolean;
                        balance: number;
                      }) => (
                        <div key={item.accountId} className="flex justify-between text-sm">
                          <span>{getAccountDisplayName(item)}</span>
                          <span>{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm">
                        <span>{t('accounting.retainedEarnings')}</span>
                        <span>{formatCurrency(balanceSheetData.balanceSheet.equity.retainedEarnings)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>{t('accounting.totalEquity')}</span>
                        <span>{formatCurrency(balanceSheetData.balanceSheet.equity.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Liabilities & Equity */}
                  <div className="flex justify-between rounded-lg bg-primary-50 p-3 text-lg font-bold dark:bg-primary-900/30">
                    <span>{t('accounting.totalLiabilitiesEquity')}</span>
                    <span>{formatCurrency(balanceSheetData.balanceSheet.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income Statement */}
          {selectedReport === 'income-statement' && incomeStatementData?.incomeStatement && (
            <div className="card">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold">{t('accounting.reports.incomeStatement')}</h3>
              </div>
              <div className="p-6">
                {/* Revenue */}
                <div className="mb-6">
                  <h4 className="mb-3 font-medium text-green-600">{t('accounting.revenue')}</h4>
                  <div className="space-y-2">
                    {incomeStatementData.incomeStatement.revenue.items.map((item: {
                      accountId: string;
                      accountNumber: string;
                      accountName: string;
                      category: string;
                      isSystemAccount: boolean;
                      balance: number;
                    }) => (
                      <div key={item.accountId} className="flex justify-between text-sm">
                        <span className="pl-4">{getAccountDisplayName(item)}</span>
                        <span>{formatCurrency(item.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>{t('accounting.totalRevenue')}</span>
                      <span className="text-green-600">
                        {formatCurrency(incomeStatementData.incomeStatement.revenue.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div className="mb-6">
                  <h4 className="mb-3 font-medium text-red-600">{t('accounting.expenses')}</h4>
                  <div className="space-y-2">
                    {incomeStatementData.incomeStatement.expenses.items.map((item: {
                      accountId: string;
                      accountNumber: string;
                      accountName: string;
                      category: string;
                      isSystemAccount: boolean;
                      balance: number;
                    }) => (
                      <div key={item.accountId} className="flex justify-between text-sm">
                        <span className="pl-4">{getAccountDisplayName(item)}</span>
                        <span>{formatCurrency(item.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>{t('accounting.totalExpenses')}</span>
                      <span className="text-red-600">
                        {formatCurrency(incomeStatementData.incomeStatement.expenses.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div
                  className={`flex justify-between rounded-lg p-4 text-xl font-bold ${
                    incomeStatementData.incomeStatement.netIncome >= 0
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  <span>{t('accounting.netIncome')}</span>
                  <span>{formatCurrency(incomeStatementData.incomeStatement.netIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other reports */}
          {(selectedReport === 'trial-balance' ||
            selectedReport === 'cash-flow' ||
            selectedReport === 'aging') && (
            <div className="card p-8 text-center text-gray-500">
              <p>{t('accounting.reportComingSoon')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
