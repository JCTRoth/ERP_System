import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import CustomerModal from './CustomerModal';

const GET_CUSTOMERS = gql`
  query GetCustomers {
    customers {
      id
      customerNumber
      name
      contactPerson
      email
      phone
      website
      taxId
      creditLimit
      status
      createdAt
    }
  }
`;

const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: UUID!) {
    deleteCustomer(id: $id)
  }
`;

interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  legalName: string;
  type: string;
  status: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  creditLimit: number;
  paymentTermDays: number;
  currency: string;
  contactPerson: string;
}

export default function CustomersTab() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data, loading, refetch, error } = useQuery(GET_CUSTOMERS, {
    variables: {
      first: 20,
    },
    errorPolicy: 'all',
  });

  const [deleteCustomer] = useMutation(DELETE_CUSTOMER, {
    onCompleted: () => refetch(),
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    refetch();
  };

  // Handle unavailable service or errors gracefully
  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Customers data could not be loaded. Please try again later.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('masterdata.confirmDelete'))) {
      await deleteCustomer({ variables: { id } });
    }
  };

  const customers = data?.customers || [];
  const filteredCustomers = customers.filter((customer: Customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.customerNumber.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.contactPerson?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('masterdata.searchCustomers')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-64 pl-10"
            />
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('masterdata.addCustomer')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.company') || 'Company'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('masterdata.vatNumber') || 'VAT Number'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {t('masterdata.noCustomers')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: Customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="font-medium">
                        {customer.name}
                      </p>
                      <p className="text-sm text-gray-500">{customer.customerNumber}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {customer.contactPerson || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm">
                        {customer.email && <p>{customer.email}</p>}
                        {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {customer.taxId || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
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

      {/* Total count */}
      {filteredCustomers.length >= 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {t('common.total')}: {filteredCustomers.length} {t('masterdata.customers')?.toLowerCase() || 'customers'}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
