import { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, UsersIcon, ShieldCheckIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import UserModal from './UserModal';
import GroupsTab from './GroupsTab';
import MembersTab from './MembersTab';

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
  mutation DeactivateUser($id: UUID!) {
    deactivateUser(id: $id)
  }
`;

const ACTIVATE_USER = gql`
  mutation ActivateUser($id: UUID!) {
    activateUser(id: $id)
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
  const [activeTab, setActiveTab] = useState<'users' | 'members' | 'groups'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const { data, loading, refetch } = useQuery(GET_USERS);
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => refetch(),
  });
  const [activateUser] = useMutation(ACTIVATE_USER, {
    onCompleted: () => refetch(),
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm(t('users.confirmDelete'))) {
      try {
        await deleteUser({ variables: { id } });
      } catch (err: any) {
        console.error('Deactivate user failed:', err);
        alert(err.message || 'Failed to deactivate user');
      }
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateUser({ variables: { id } });
    } catch (err: any) {
      console.error('Activate user failed:', err);
      alert(err.message || 'Failed to activate user');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    refetch();
  };

  const users: User[] = data?.users ?? [];
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('users.titleUsersGroups')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('users.subtitleUsersGroups')}
          </p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t('users.addUser')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <UsersIcon className="h-5 w-5" />
            {t('users.tabUsers')}
            {users.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                {users.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            {t('users.tabMembers')}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'groups'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <ShieldCheckIcon className="h-5 w-5" />
            {t('users.tabGroups')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <>
          {/* Stats Bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm sm:min-w-[280px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('users.searchPlaceholder')}
                  className="input pl-9 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                {activeCount} {t('common.active')}
              </span>
              {inactiveCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {inactiveCount} {t('common.inactive')}
                </span>
              )}
            </div>
          </div>

          {/* Users Table */}
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {search ? t('users.noResults') : t('users.noUsers')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: User) => (
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
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="text-red-600 hover:text-red-800"
                          title={t('users.deactivate')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(user.id)}
                          className="text-green-600 hover:text-green-800"
                          title={t('users.activate')}
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
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
        </>
      ) : activeTab === 'members' ? (
        <MembersTab />
      ) : (
        <GroupsTab />
      )}
    </div>
  );
}
