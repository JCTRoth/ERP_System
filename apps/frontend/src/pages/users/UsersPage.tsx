import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import UserModal from './UserModal';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
      firstName
      lastName
      preferredLanguage
      isActive
      createdAt
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, loading, refetch } = useQuery(GET_USERS);
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => refetch(),
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('users.confirmDelete'))) {
      await deleteUser({ variables: { id } });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    refetch();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('users.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('users.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('users.addUser')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('users.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('users.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('users.language')}
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
                  <td colSpan={5} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {t('users.noUsers')}
                  </td>
                </tr>
              ) : (
                data?.users?.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="uppercase">{user.preferredLanguage}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          user.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {user.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(user)}
                        className="mr-2 text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <UserModal
          user={editingUser}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
