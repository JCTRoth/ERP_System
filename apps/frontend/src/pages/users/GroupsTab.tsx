import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useAuthStore } from '../../stores/authStore';
import GroupModal from './GroupModal';

const GET_GROUPS = gql`
  query GetGroupsByCompany($companyId: ID!) {
    groupsByCompany(companyId: $companyId) {
      id
      companyId
      code
      name
      description
      isSystem
      createdAt
      permissions {
        permissionCode
        scopeType
        scopeJson
      }
    }
  }
`;

const DELETE_GROUP = gql`
  mutation DeleteGroup($groupId: ID!) {
    deleteGroup(groupId: $groupId)
  }
`;

export interface AuthGroup {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: { permissionCode: string; scopeType: string; scopeJson: string | null }[];
}

export default function GroupsTab() {
  const { t } = useI18n();
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AuthGroup | null>(null);

  const { data, loading, refetch } = useQuery(GET_GROUPS, {
    variables: { companyId: currentCompanyId },
    skip: !currentCompanyId,
  });

  const [deleteGroupMutation] = useMutation(DELETE_GROUP, {
    onCompleted: () => refetch(),
  });

  const handleEdit = (group: AuthGroup) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = async (group: AuthGroup) => {
    if (group.isSystem) return;
    if (window.confirm(t('groups.confirmDelete'))) {
      await deleteGroupMutation({ variables: { groupId: group.id } });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    refetch();
  };

  const groups: AuthGroup[] = data?.groupsByCompany ?? [];

  if (!currentCompanyId) {
    return (
      <div className="card p-8 text-center text-gray-500">
        {t('groups.selectCompanyFirst')}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('groups.subtitle')}</p>
        <button
          onClick={() => {
            setEditingGroup(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('groups.addGroup')}
        </button>
      </div>

      {/* Groups List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : groups.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-500">{t('groups.noGroups')}</div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="card flex flex-col justify-between p-5"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-primary-500" />
                    <h3 className="font-semibold">{group.name}</h3>
                  </div>
                  {group.isSystem && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {t('groups.system')}
                    </span>
                  )}
                </div>
                <p className="mb-1 text-xs font-mono text-gray-400">{group.code}</p>
                {group.description && (
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {group.permissions.slice(0, 5).map((perm) => (
                    <span
                      key={perm.permissionCode}
                      className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {perm.permissionCode}
                    </span>
                  ))}
                  {group.permissions.length > 5 && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700">
                      +{group.permissions.length - 5} {t('common.more')}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(group)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                  title={t('common.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                {!group.isSystem && (
                  <button
                    onClick={() => handleDelete(group)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title={t('common.delete')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <GroupModal
          group={editingGroup}
          companyId={currentCompanyId}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
