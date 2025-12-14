import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useI18n } from '../../providers/I18nProvider';

const GET_SUPPLIERS = gql`
  query GetSuppliers($first: Int, $where: SupplierFilterInput) {
    suppliers(first: $first, where: $where, order: { supplierNumber: ASC }) {
      nodes {
        id
        supplierNumber
        name
        legalName
        type
        status
        rating
        email
        phone
        website
        taxId
        paymentTermDays
        currency
        createdAt
      }
      totalCount
    }
  }
`;

interface Supplier {
  id: string;
  supplierNumber: string;
  name: string;
  legalName: string;
  type: string;
  status: string;
  rating: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  paymentTermDays: number;
  currency: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const RATING_MAP: Record<string, number> = {
  EXCELLENT: 5,
  GOOD: 4,
  SATISFACTORY: 3,
  NEEDS_IMPROVEMENT: 2,
  POOR: 1,
  NOT_RATED: 0,
};

export default function SuppliersTab() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, loading } = useQuery(GET_SUPPLIERS, {
    variables: {
      first: 100,
      where: statusFilter !== 'all' ? { status: { eq: statusFilter } } : undefined,
    },
  });

  const filteredSuppliers = data?.suppliers?.nodes?.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.supplierNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRating = (rating: string) => {
    const stars = RATING_MAP[rating] || 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= stars ? (
            <StarIconSolid key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('masterdata.searchSuppliers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-64 pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('common.allStatuses')}</option>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="INACTIVE">{t('common.inactive')}</option>
            <option value="PENDING_APPROVAL">{t('masterdata.pendingApproval')}</option>
            <option value="SUSPENDED">{t('masterdata.suspended')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.supplierNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.rating')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
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
              ) : filteredSuppliers?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {t('masterdata.noSuppliers')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers?.map((supplier: Supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono font-medium">{supplier.supplierNumber}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.legalName && supplier.legalName !== supplier.name && (
                          <p className="text-sm text-gray-500">{supplier.legalName}</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm">
                        {t(`masterdata.supplierType.${supplier.type.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">
                        {supplier.email && <p>{supplier.email}</p>}
                        {supplier.phone && <p className="text-gray-500">{supplier.phone}</p>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderRating(supplier.rating)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          STATUS_COLORS[supplier.status] || STATUS_COLORS.ACTIVE
                        }`}
                      >
                        {t(`masterdata.status.${supplier.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
