import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import CompanyModal from './CompanyModal';

const GET_COMPANIES = gql`
  query GetCompanies {
    companies {
      id
      name
      slug
      description
      logoUrl
      isDemo
      isActive
      createdAt
    }
  }
`;

const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id)
  }
`;

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isDemo: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function CompaniesPage() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_COMPANIES, {
    errorPolicy: 'all',
  });
  const [deleteCompany] = useMutation(DELETE_COMPANY, {
    onCompleted: () => refetch(),
  });

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('companies.confirmDelete'))) {
      await deleteCompany({ variables: { id } });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    refetch();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('companies.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('companies.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
          disabled={error?.message?.includes('Unknown type') || error?.message?.includes('Cannot query field')}
        >
          <PlusIcon className="h-5 w-5" />
          {t('companies.addCompany')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {error?.message?.includes('Unknown type') || error?.message?.includes('Cannot query field') ? (
          <div className="border border-yellow-200 bg-yellow-50 p-6 text-center dark:border-yellow-900/30 dark:bg-yellow-900/20">
            <h3 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-400">
              {t('common.serviceUnavailable')}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              The Companies service is not yet available. This feature will be enabled when the company service is deployed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('companies.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('companies.slug')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.createdAt')}
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
              ) : data?.companies?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {t('companies.noCompanies')}
                  </td>
                </tr>
              ) : (
                data?.companies?.map((company: Company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                            {company.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.isDemo && (
                            <span className="text-xs text-orange-600">Demo</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {company.slug}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          company.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {company.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(company)}
                        className="mr-2 text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={company.isDemo}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CompanyModal
          company={editingCompany}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
