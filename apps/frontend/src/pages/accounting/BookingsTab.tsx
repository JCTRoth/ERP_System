import { useMemo, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useI18n } from '../../providers/I18nProvider';
import { ArrowDownTrayIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

const GET_JOURNAL_ENTRIES = gql`
  query GetJournalEntries($first: Int, $where: JournalEntryFilterInput) {
    journalEntries(first: $first, where: $where, order: { entryDate: DESC }) {
      nodes {
        id
        entryNumber
        entryDate
        type
        status
        description
        reference
        totalDebit
        totalCredit
        lines {
          id
          accountNumber
          accountName
          debit
          credit
        }
      }
      totalCount
    }
  }
`;

interface JournalEntryLine {
  id: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  type: string;
  status: string;
  description: string;
  reference: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalEntryLine[];
}

const STATUS_OPTIONS = ['DRAFT', 'PENDING', 'POSTED', 'REVERSED'] as const;
const TYPE_OPTIONS = ['STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING', 'RECURRING'] as const;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function BookingsTab() {
  const { t } = useI18n();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const dateFilter = useMemo(() => {
    const filters: any = {};
    if (startDate) {
      filters.gte = new Date(`${startDate}T00:00:00Z`).toISOString();
    }
    if (endDate) {
      filters.lte = new Date(`${endDate}T23:59:59Z`).toISOString();
    }
    return Object.keys(filters).length ? { entryDate: filters } : undefined;
  }, [startDate, endDate]);

  const { data, loading, error } = useQuery(GET_JOURNAL_ENTRIES, {
    variables: {
      first: 200,
      where: {
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
        ...(typeFilter !== 'all' && { type: { eq: typeFilter } }),
        ...(dateFilter || {}),
      },
    },
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const entries: JournalEntry[] = data?.journalEntries?.nodes || [];

  const handleExport = () => {
    if (!entries.length) return;

    const header = ['Entry Number', 'Date', 'Type', 'Status', 'Reference', 'Description', 'Total Debit', 'Total Credit'];
    const rows = entries.map((entry) => [
      entry.entryNumber,
      formatDate(entry.entryDate),
      entry.type,
      entry.status,
      entry.reference || '',
      entry.description || '',
      entry.totalDebit,
      entry.totalCredit,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bookings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          {t('accounting.bookingsUnavailable') || 'The bookings log could not be loaded. This feature will be available when the accounting service is deployed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.from') || 'From'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.to') || 'To'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('common.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('common.allStatuses')}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`accounting.status.${status.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('accounting.type')}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('accounting.allTypes')}</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {t(`accounting.entryType.${type.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2"
          disabled={!entries.length}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {t('accounting.exportCsv') || 'Export CSV'}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.entryNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.reference') || 'Reference'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.description')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.debit')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('accounting.credit')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : !entries.length ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    {t('accounting.noBookings') || 'No bookings found'}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium">{entry.entryNumber}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(entry.entryDate)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{t(`accounting.entryType.${entry.type.toLowerCase()}`)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {t(`accounting.status.${entry.status.toLowerCase()}`)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {entry.reference || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-w-xs truncate" title={entry.description}>{entry.description || '—'}</div>
                      {entry.lines?.slice(0, 2).map((line) => (
                        <div key={line.id} className="flex justify-between text-xs text-gray-500">
                          <span className="font-mono">{line.accountNumber}</span>
                          <span>
                            {line.debit > 0 ? `${t('accounting.debitShort') || 'DR'} ${formatCurrency(line.debit)}` : `${t('accounting.creditShort') || 'CR'} ${formatCurrency(line.credit)}`}
                          </span>
                        </div>
                      ))}
                      {entry.lines && entry.lines.length > 2 && (
                        <div className="text-xs text-gray-400">+{entry.lines.length - 2} {t('accounting.moreLines') || 'more lines'}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(entry.totalDebit)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium">{formatCurrency(entry.totalCredit)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        title={t('common.view')}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">{selectedEntry.entryNumber}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(selectedEntry.entryDate)} · {t(`accounting.entryType.${selectedEntry.type.toLowerCase()}`)} · {t(`accounting.status.${selectedEntry.status.toLowerCase()}`)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label={t('common.close') || 'Close'}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.reference') || 'Reference'}</p>
                <p className="font-medium">{selectedEntry.reference || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.description')}</p>
                <p className="font-medium">{selectedEntry.description || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.totalDebit')}</p>
                <p className="font-medium">{formatCurrency(selectedEntry.totalDebit)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounting.totalCredit')}</p>
                <p className="font-medium">{formatCurrency(selectedEntry.totalCredit)}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('accounting.entries')}</h4>
              <div className="mt-3 space-y-2">
                {selectedEntry.lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700">
                    <div>
                      <div className="font-mono text-xs text-gray-500">{line.accountNumber}</div>
                      <div className="font-medium">{line.accountName}</div>
                    </div>
                    <div className="text-right font-medium">
                      {line.debit > 0 ? (
                        <span className="text-green-700 dark:text-green-300">{t('accounting.debitShort') || 'DR'} {formatCurrency(line.debit)}</span>
                      ) : (
                        <span className="text-blue-700 dark:text-blue-300">{t('accounting.creditShort') || 'CR'} {formatCurrency(line.credit)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
