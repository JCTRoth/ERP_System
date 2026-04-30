import { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useAuthStore } from '../../stores/authStore';
import UserGroupsModal from './UserGroupsModal';

const GET_COMPANY_MEMBERS = gql`
  query GetCompanyMembers($companyId: ID!) {
    assignmentsByCompany(companyId: $companyId) {
      id
      userId
      companyId
      companyName
      role
      assignedAt
    }
    groupsByCompany(companyId: $companyId) {
      id
      code
      name
      isSystem
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      email
      firstName
      lastName
      isActive
    }
  }
`;

const ASSIGN_USER = gql`
  mutation AssignUserToCompany($input: AssignUserInput!) {
    assignUserToCompany(input: $input) {
      id
      userId
      companyId
      role
    }
  }
`;

const UPDATE_ROLE = gql`
  mutation UpdateAssignmentRole($userId: ID!, $companyId: ID!, $role: UserRole!) {
    updateAssignmentRole(userId: $userId, companyId: $companyId, role: $role) {
      id
      userId
      role
    }
  }
`;

const REMOVE_USER = gql`
  mutation RemoveUserFromCompany($userId: ID!, $companyId: ID!) {
    removeUserFromCompany(userId: $userId, companyId: $companyId)
  }
`;

interface Assignment {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  role: string;
  assignedAt: string;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface GroupInfo {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'] as const;

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  USER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function MembersTab() {
  const { t } = useI18n();
  const currentCompanyId = useAuthStore((s) => s.currentCompanyId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupsModalUserId, setGroupsModalUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');

  const { data: membersData, loading, refetch } = useQuery(GET_COMPANY_MEMBERS, {
    variables: { companyId: currentCompanyId },
    skip: !currentCompanyId,
  });

  const { data: usersData } = useQuery(GET_ALL_USERS);

  const [assignUser] = useMutation(ASSIGN_USER, { onCompleted: () => refetch() });
  const [updateRole] = useMutation(UPDATE_ROLE, { onCompleted: () => refetch() });
  const [removeUser] = useMutation(REMOVE_USER, { onCompleted: () => refetch() });

  const assignments: Assignment[] = membersData?.assignmentsByCompany ?? [];
  const groups: GroupInfo[] = membersData?.groupsByCompany ?? [];
  const allUsers: UserInfo[] = usersData?.users ?? [];

  // Normalize UUID: strip dashes for consistent comparison
  const normalizeId = (id: string) => id.replace(/-/g, '');

  // Format UUID with dashes (company service expects standard UUID format)
  const formatUuid = (id: string) => {
    const clean = id.replace(/-/g, '');
    if (clean.length !== 32) return id;
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  };

  // Build user lookup map (keyed by normalized ID for cross-service compatibility)
  const userMap = useMemo(() => {
    const map = new Map<string, UserInfo>();
    for (const u of allUsers) {
      map.set(normalizeId(u.id), u);
    }
    return map;
  }, [allUsers]);

  const lookupUser = (userId: string) => userMap.get(normalizeId(userId));

  // Assigned user IDs (normalized for cross-service comparison)
  const assignedUserIds = useMemo(
    () => new Set(assignments.map((a) => normalizeId(a.userId))),
    [assignments]
  );

  // Unassigned users (for add modal)
  const unassignedUsers = useMemo(
    () => allUsers.filter((u) => !assignedUserIds.has(normalizeId(u.id)) && u.isActive),
    [allUsers, assignedUserIds]
  );

  // Filter and search
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (roleFilter && a.role !== roleFilter) return false;
      if (!search) return true;
      const user = lookupUser(a.userId);
      if (!user) return false;
      const q = search.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
      );
    });
  }, [assignments, search, roleFilter, userMap]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateRole({
      variables: { userId: formatUuid(userId), companyId: currentCompanyId, role: newRole },
    });
  };

  const handleRemove = async (userId: string) => {
    const user = lookupUser(userId);
    const name = user ? `${user.firstName} ${user.lastName}` : userId;
    if (window.confirm(t('members.confirmRemove', { name }))) {
      await removeUser({ variables: { userId: formatUuid(userId), companyId: currentCompanyId } });
    }
  };

  const handleAddUser = async (userId: string, role: string) => {
    await assignUser({
      variables: { input: { userId: formatUuid(userId), companyId: currentCompanyId, role } },
    });
    setShowAddModal(false);
  };

  if (!currentCompanyId) {
    return (
      <div className="card p-8 text-center text-gray-500">
        {t('members.selectCompanyFirst')}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('members.searchPlaceholder')}
              className="input pl-9 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">{t('members.allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`members.role.${r}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredAssignments.length} {t('members.memberCount')}
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            {t('members.addMember')}
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('members.member')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('members.email')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('members.role')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('members.joinedAt')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {search || roleFilter ? t('members.noResults') : t('members.noMembers')}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => {
                  const user = lookupUser(assignment.userId);
                  const isSelf = currentUserId ? normalizeId(assignment.userId) === normalizeId(currentUserId) : false;

                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600 dark:bg-primary-900/30">
                            {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {user ? `${user.firstName} ${user.lastName}` : assignment.userId}
                              {isSelf && (
                                <span className="ml-1.5 text-xs text-gray-400">({t('members.you')})</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {user?.email ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <select
                          value={assignment.role}
                          onChange={(e) => handleRoleChange(assignment.userId, e.target.value)}
                          disabled={isSelf}
                          className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold focus:ring-2 focus:ring-primary-500 ${
                            ROLE_COLORS[assignment.role] ?? ROLE_COLORS.VIEWER
                          } ${isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t(`members.role.${r}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setGroupsModalUserId(assignment.userId)}
                            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                            title={t('members.manageGroups')}
                          >
                            <UserGroupIcon className="h-4 w-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleRemove(assignment.userId)}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              title={t('members.removeMember')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          users={unassignedUsers}
          onAdd={handleAddUser}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* User Groups Modal */}
      {groupsModalUserId && currentCompanyId && (
        <UserGroupsModal
          userId={formatUuid(groupsModalUserId)}
          companyId={currentCompanyId}
          userName={
            lookupUser(groupsModalUserId)
              ? `${lookupUser(groupsModalUserId)!.firstName} ${lookupUser(groupsModalUserId)!.lastName}`
              : groupsModalUserId
          }
          availableGroups={groups}
          onClose={() => {
            setGroupsModalUserId(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

// ─── Add Member Modal ──────────────────────────────────────────────────────

function AddMemberModal({
  users,
  onAdd,
  onClose,
}: {
  users: UserInfo[];
  onAdd: (userId: string, role: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('USER');
  const [search, setSearch] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold">{t('members.addMember')}</h3>

        <div className="space-y-4">
          <div>
            <label className="label mb-1">{t('members.searchUser')}</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('members.searchUserPlaceholder')}
                className="input pl-9 text-sm"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {filteredUsers.length === 0 ? (
              <p className="p-3 text-center text-sm text-gray-500">{t('members.noUsersAvailable')}</p>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedUser === user.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="user"
                    value={user.id}
                    checked={selectedUser === user.id}
                    onChange={() => setSelectedUser(user.id)}
                    className="text-primary-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          <div>
            <label className="label mb-1">{t('members.role')}</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`members.role.${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => selectedUser && onAdd(selectedUser, selectedRole)}
            disabled={!selectedUser}
            className="btn-primary text-sm"
          >
            {t('members.addMember')}
          </button>
        </div>
      </div>
    </div>
  );
}
