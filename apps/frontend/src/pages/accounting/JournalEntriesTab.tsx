import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  PlusIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

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
          accountId
          accountNumber
          accountName
          debit
          credit
          description
        }
        createdAt
      }
      totalCount
    }
  }
`;

interface JournalEntryLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
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
  createdAt: string;
}

const ENTRY_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  POSTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REVERSED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function JournalEntriesTab() {
  const { t } = useI18n();
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, loading } = useQuery(GET_JOURNAL_ENTRIES, {
    variables: {
      first: 100,
      where: {
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
        ...(typeFilter !== 'all' && { type: { eq: typeFilter } }),
      },
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            <option value="all">{t('accounting.allTypes')}</option>
            <option value="STANDARD">{t('accounting.entryType.standard')}</option>
            <option value="ADJUSTING">{t('accounting.entryType.adjusting')}</option>
            <option value="CLOSING">{t('accounting.entryType.closing')}</option>
            <option value="REVERSING">{t('accounting.entryType.reversing')}</option>
            <option value="RECURRING">{t('accounting.entryType.recurring')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('accounting.allStatuses')}</option>
            <option value="DRAFT">{t('accounting.status.draft')}</option>
            <option value="PENDING">{t('accounting.status.pending')}</option>
            <option value="POSTED">{t('accounting.status.posted')}</option>
            <option value="REVERSED">{t('accounting.status.reversed')}</option>
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {t('accounting.createJournalEntry')}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Entries List */}
        <div className="flex-1">
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
                      {t('accounting.description')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('common.status')}
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
                      <td colSpan={7} className="px-6 py-4 text-center">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : data?.journalEntries?.nodes?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {t('accounting.noJournalEntries')}
                      </td>
                    </tr>
                  ) : (
                    data?.journalEntries?.nodes?.map((entry: JournalEntry) => (
                      <tr
                        key={entry.id}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          selectedEntry?.id === entry.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-mono font-medium">{entry.entryNumber}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="max-w-xs truncate">{entry.description}</p>
                          {entry.reference && (
                            <p className="text-sm text-gray-500">Ref: {entry.reference}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              ENTRY_STATUS_COLORS[entry.status] || ENTRY_STATUS_COLORS.DRAFT
                            }`}
                          >
                            {t(`accounting.status.${entry.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                          {formatCurrency(entry.totalDebit)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                          {formatCurrency(entry.totalCredit)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(entry);
                            }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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
        </div>

        {/* Entry Details Panel */}
        {selectedEntry && (
          <div className="w-96">
            <div className="card sticky top-4">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedEntry.entryNumber}</h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      ENTRY_STATUS_COLORS[selectedEntry.status]
                    }`}
                  >
                    {t(`accounting.status.${selectedEntry.status.toLowerCase()}`)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(selectedEntry.entryDate)}
                </p>
              </div>

              <div className="p-6">
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {selectedEntry.description}
                </p>

                {/* Lines */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-500">
                    {t('accounting.entries')}
                  </h4>
                  {selectedEntry.lines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                    >
                      <div className="flex justify-between">
                        <span className="font-mono text-sm">
                          {line.accountNumber}
                        </span>
                        {line.debit > 0 ? (
                          <span className="text-sm font-medium">
                            DR {formatCurrency(line.debit)}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">
                            CR {formatCurrency(line.credit)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {line.accountName}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-600">
                  <div className="flex justify-between text-sm">
                    <span>{t('accounting.totalDebit')}</span>
                    <span className="font-medium">{formatCurrency(selectedEntry.totalDebit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('accounting.totalCredit')}</span>
                    <span className="font-medium">{formatCurrency(selectedEntry.totalCredit)}</span>
                  </div>
                  {selectedEntry.totalDebit === selectedEntry.totalCredit && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      {t('accounting.balanced')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedEntry.status === 'DRAFT' && (
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary flex-1">
                      {t('common.edit')}
                    </button>
                    <button className="btn-primary flex-1">
                      {t('accounting.post')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
