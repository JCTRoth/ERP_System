import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ComputerDesktopIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import AssetModal, { type Asset as AssetModalAsset } from './AssetModal';

// Helper function to convert PascalCase to camelCase
const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

const GET_ASSETS = gql`
  query GetAssets($first: Int, $where: AssetFilterInput) {
    assets(first: $first, where: $where, order: { assetNumber: ASC }) {
      nodes {
        id
        assetNumber
        name
        description
        type
        status
        serialNumber
        purchaseDate
        purchasePrice
        currentValue
        accumulatedDepreciation
        category {
          id
          name
        }
        location {
          id
          name
        }
        assignedTo {
          id
          firstName
          lastName
        }
      }
      totalCount
    }
  }
`;

type Asset = AssetModalAsset & {
  assetNumber: string;
  serialNumber: string | null;
  accumulatedDepreciation: number;
  category: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DISPOSED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RESERVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const TYPE_ICONS: Record<string, typeof ComputerDesktopIcon> = {
  IT_EQUIPMENT: ComputerDesktopIcon,
  VEHICLE: TruckIcon,
  MACHINERY: WrenchScrewdriverIcon,
  FURNITURE: BuildingOfficeIcon,
};

export default function AssetsTab() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_ASSETS, {
    variables: {
      first: 100,
      where: {
        ...(typeFilter !== 'all' && { type: { eq: typeFilter } }),
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
      },
    },
    errorPolicy: 'all',
  });

  // Handle unavailable service
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Assets data could not be loaded. This feature will be available when the masterdata service is deployed.
        </p>
      </div>
    );
  }

  const filteredAssets = data?.assets?.nodes?.filter((asset: Asset) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Summary stats
  const totalAssets = data?.assets?.totalCount || 0;
  const totalValue = data?.assets?.nodes?.reduce(
    (sum: number, asset: Asset) => sum + (asset.currentValue || 0),
    0
  ) || 0;
  const activeAssets = data?.assets?.nodes?.filter(
    (asset: Asset) => asset.status === 'ACTIVE'
  ).length || 0;

  const handleAddClick = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const handleEditClick = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingAsset(null);
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('masterdata.totalAssets')}</p>
          <p className="text-2xl font-bold">{totalAssets}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('masterdata.totalValue')}</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('masterdata.activeAssets')}</p>
          <p className="text-2xl font-bold">{activeAssets}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('masterdata.searchAssets')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-64 pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('masterdata.allTypes')}</option>
            <option value="IT_EQUIPMENT">{t('masterdata.assetType.it_equipment')}</option>
            <option value="VEHICLE">{t('masterdata.assetType.vehicle')}</option>
            <option value="MACHINERY">{t('masterdata.assetType.machinery')}</option>
            <option value="FURNITURE">{t('masterdata.assetType.furniture')}</option>
            <option value="BUILDING">{t('masterdata.assetType.building')}</option>
            <option value="LAND">{t('masterdata.assetType.land')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('common.allStatuses')}</option>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="INACTIVE">{t('common.inactive')}</option>
            <option value="MAINTENANCE">{t('masterdata.maintenance')}</option>
            <option value="DISPOSED">{t('masterdata.disposed')}</option>
          </select>
        </div>
        <button onClick={handleAddClick} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {t('masterdata.addAsset')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.asset')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.assignedTo')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.value')}
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
              ) : filteredAssets?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {t('masterdata.noAssets')}
                  </td>
                </tr>
              ) : (
                filteredAssets?.map((asset: Asset) => {
                  const Icon = TYPE_ICONS[asset.type] || ComputerDesktopIcon;
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700">
                            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="font-mono text-sm text-gray-500">{asset.assetNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="text-sm">
                            {t(`masterdata.assetType.${toCamelCase(asset.type)}`)}
                          </p>
                          {asset.category && (
                            <p className="text-sm text-gray-500">{asset.category.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {asset.location?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {asset.assignedTo ? (
                          <span>
                            {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('masterdata.unassigned')}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div>
                          <p className="font-medium">{formatCurrency(asset.currentValue)}</p>
                          <p className="text-sm text-gray-500">
                            {t('masterdata.purchased')}: {formatCurrency(asset.purchasePrice)}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            STATUS_COLORS[asset.status] || STATUS_COLORS.ACTIVE
                          }`}
                        >
                          {t(`masterdata.assetStatus.${asset.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(asset)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AssetModal
          asset={editingAsset}
          onClose={handleModalClose}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
