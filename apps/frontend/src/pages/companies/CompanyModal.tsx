import { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon, UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { normalizeUuid, uuidsEqual } from '../../utils/uuid';

const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      slug
    }
  }
`;

const UPDATE_COMPANY = gql`
  mutation UpdateCompany($id: ID!, $input: UpdateCompanyInput!) {
    updateCompany(id: $id, input: $input) {
      id
      name
      slug
    }
  }
`;

const GET_COMPANY_ASSIGNMENTS = gql`
  query GetCompanyAssignments($companyId: ID!) {
    assignmentsByCompany(companyId: $companyId) {
      id
      userId
      companyId
      companyName
      role
      assignedAt
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
      role
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

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isDemo: boolean;
  isActive: boolean;
}

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
  role: string;
}

interface Props {
  company: Company | null;
  onClose: () => void;
}

type Tab = 'details' | 'users';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'] as const;

export default function CompanyModal({ company, onClose }: Props) {
  const { t } = useI18n();
  const isEditing = !!company;
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const [formData, setFormData] = useState({
    name: company?.name || '',
    slug: company?.slug || '',
    description: company?.description || '',
    isActive: company?.isActive ?? true,
  });

  // User assignment state
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('USER');

  const [createCompany, { loading: creating }] = useMutation(CREATE_COMPANY, {
    onCompleted: onClose,
  });

  const [updateCompany, { loading: updating }] = useMutation(UPDATE_COMPANY, {
    onCompleted: onClose,
  });

  // Query assignments for this company (only when editing)
  const { data: assignmentsData, refetch: refetchAssignments } = useQuery(GET_COMPANY_ASSIGNMENTS, {
    variables: { companyId: company?.id },
    skip: !isEditing,
    errorPolicy: 'all',
  });

  // Query all users for the add-user dropdown and for display names
  const { data: usersData } = useQuery(GET_ALL_USERS, {
    skip: !isEditing || activeTab !== 'users',
    errorPolicy: 'all',
  });

  const [assignUser, { loading: assigning }] = useMutation(ASSIGN_USER, {
    onCompleted: () => {
      setShowAddUser(false);
      setSelectedUserId('');
      setSelectedRole('USER');
      refetchAssignments();
    },
  });

  const [updateRole] = useMutation(UPDATE_ROLE, {
    onCompleted: () => refetchAssignments(),
  });

  const [removeUser] = useMutation(REMOVE_USER, {
    onCompleted: () => refetchAssignments(),
  });

  const loading = creating || updating;
  const assignments: Assignment[] = assignmentsData?.assignmentsByCompany || [];
  const allUsers: UserInfo[] = usersData?.users || [];
  
  // Filter out users already assigned (UUID format-aware comparison)
  const availableUsers = allUsers.filter(u => 
    !assignments.some(a => uuidsEqual(a.userId, u.id))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      await updateCompany({
        variables: {
          id: company.id,
          input: formData,
        },
      });
    } else {
      await createCompany({
        variables: {
          input: formData,
        },
      });
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId || !company?.id) return;
    await assignUser({
      variables: {
        input: {
          userId: normalizeUuid(selectedUserId),
          companyId: company.id,
          role: selectedRole,
        },
      },
    });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!company?.id) return;
    await updateRole({
      variables: {
        userId,
        companyId: company.id,
        role: newRole,
      },
    });
  };

  const handleRemoveUser = async (userId: string) => {
    if (!company?.id) return;
    if (window.confirm(t('companies.confirmRemoveUser', { default: 'Are you sure you want to remove this user from the company?' }))) {
      await removeUser({
        variables: {
          userId,
          companyId: company.id,
        },
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Find user info by ID from allUsers or display userId (UUID format-aware)
  const getUserDisplayName = (userId: string) => {
    const user = allUsers.find(u => uuidsEqual(u.id, userId));
    if (user) return `${user.firstName} ${user.lastName}`;
    return userId.substring(0, 8) + '...';
  };

  const getUserEmail = (userId: string) => {
    const user = allUsers.find(u => uuidsEqual(u.id, userId));
    return user?.email || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? t('companies.editCompany') : t('companies.addCompany')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs (only show when editing) */}
        {isEditing && (
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 text-sm font-medium border-b-2 ${
                  activeTab === 'details'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {t('companies.details', { default: 'Details' })}
              </button>
              <button
                onClick={() => { setActiveTab('users'); }}
                className={`pb-3 text-sm font-medium border-b-2 ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {t('companies.users', { default: 'Users' })} ({assignments.length})
              </button>
            </nav>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label mb-1">
                {t('companies.name')} *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: isEditing ? formData.slug : generateSlug(name),
                  });
                }}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="label mb-1">
                {t('companies.slug')} *
              </label>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="input"
                required
                disabled={isEditing}
              />
            </div>

            <div>
              <label htmlFor="description" className="label mb-1">
                {t('common.description')}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[100px]"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm">
                {t('common.active')}
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && isEditing && (
          <div className="space-y-4">
            {/* Add User Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <UserPlusIcon className="h-4 w-4" />
                {t('companies.addUser', { default: 'Add User' })}
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <h4 className="font-medium text-sm">{t('companies.assignUser', { default: 'Assign User to Company' })}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1 text-xs">{t('companies.selectUser', { default: 'User' })}</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="input text-sm"
                    >
                      <option value="">{t('companies.selectUserPlaceholder', { default: '-- Select User --' })}</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label mb-1 text-xs">{t('companies.role', { default: 'Role' })}</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="input text-sm"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddUser(false)}
                    className="btn-secondary text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleAssignUser}
                    disabled={!selectedUserId || assigning}
                    className="btn-primary text-sm"
                  >
                    {assigning ? t('common.saving') : t('companies.assign', { default: 'Assign' })}
                  </button>
                </div>
              </div>
            )}

            {/* Assignments List */}
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>{t('companies.noUsersAssigned', { default: 'No users assigned to this company' })}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getUserDisplayName(assignment.userId)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getUserEmail(assignment.userId) || `ID: ${assignment.userId.substring(0, 12)}...`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={assignment.role}
                        onChange={(e) => handleRoleChange(assignment.userId, e.target.value)}
                        className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveUser(assignment.userId)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title={t('companies.removeUser', { default: 'Remove user' })}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4">
              <button onClick={onClose} className="btn-secondary">
                {t('common.close', { default: 'Close' })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
