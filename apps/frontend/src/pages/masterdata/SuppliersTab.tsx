import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import SupplierModal, { type Supplier } from './SupplierModal';
import Tooltip, { IconButtonWithTooltip } from '../../components/Tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';

const GET_SUPPLIERS = gql`
  query GetSuppliers($first: Int) {
    suppliers(first: $first) {
      nodes {
        id
        name
        code
        contactPerson
        email
        phone
        address
        city
        postalCode
        country
        vatNumber
        leadTimeDays
        currency
        isActive
        createdAt
      }
      totalCount
    }
  }
`;

const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: UUID!) {
    deleteSupplier(id: $id)
  }
`;

export default function SuppliersTab() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_SUPPLIERS, {
    variables: {
      first: 20,
    },
    errorPolicy: 'all',
  });

  const [deleteSupplier, { loading: deleteLoading }] = useMutation(DELETE_SUPPLIER, {
    errorPolicy: 'all',
    onCompleted: () => {
      setDeleteConfirm(null);
      refetch();
    },
  });

  const handleAddClick = () => {
    setEditingSupplier(null);
    setShowModal(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setDeleteConfirm(supplier);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await deleteSupplier({ variables: { id: deleteConfirm.id } });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  // Handle unavailable service or errors gracefully
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Suppliers data could not be loaded. Please try again later.
        </p>
      </div>
    );
  }

  const suppliers = data?.suppliers?.nodes || [];
  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        </div>
          <button onClick={handleAddClick} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            {t('masterdata.addSupplier')}
          </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.code') || 'Code'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.location') || 'Location'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.leadTime') || 'Lead Time'}
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
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {t('masterdata.noSuppliers')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono font-medium">{supplier.code || '-'}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contactPerson && (
                          <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">
                        {supplier.email && <p>{supplier.email}</p>}
                        {supplier.phone && <p className="text-gray-500">{supplier.phone}</p>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">
                        {supplier.city && supplier.country ? (
                          <p>{supplier.city}, {supplier.country}</p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm">
                        {supplier.leadTimeDays} {t('common.days') || 'days'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          supplier.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {supplier.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <IconButtonWithTooltip
                          icon={<PencilIcon className="h-5 w-5" />}
                          tooltip={t('common.edit')}
                          onClick={() => handleEditClick(supplier)}
                          position="top"
                        />
                        <IconButtonWithTooltip
                          icon={<TrashIcon className="h-5 w-5" />}
                          tooltip={t('common.delete')}
                          onClick={() => handleDeleteClick(supplier)}
                          position="top"
                          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total count */}
      {data?.suppliers?.totalCount !== undefined && data.suppliers.totalCount >= 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {t('common.total')}: {data.suppliers.totalCount} {t('masterdata.suppliers')?.toLowerCase() || 'suppliers'}
        </div>
      )}

      {/* Supplier Modal */}
      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={handleModalClose}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title={t('masterdata.deleteSupplier')}
          message={t('masterdata.deleteSupplierConfirm', { name: deleteConfirm.name }) || `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleteLoading}
          variant="danger"
        />
      )}
    </div>
  );
}
