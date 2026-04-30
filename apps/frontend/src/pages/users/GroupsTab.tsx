import { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
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
  const [search, setSearch] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [showSystemGroups, setShowSystemGroups] = useState(true);

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

  const allGroups: AuthGroup[] = data?.groupsByCompany ?? [];

  const filteredGroups = useMemo(() => {
    return allGroups.filter((g) => {
      if (!showSystemGroups && g.isSystem) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q) ||
        g.permissions.some((p) => p.permissionCode.toLowerCase().includes(q))
      );
    });
  }, [allGroups, search, showSystemGroups]);

  const systemCount = allGroups.filter((g) => g.isSystem).length;
  const customCount = allGroups.length - systemCount;

  if (!currentCompanyId) {
    return (
      <div className="card p-8 text-center text-gray-500">
        {t('groups.selectCompanyFirst')}
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
              placeholder={t('groups.searchPlaceholder')}
              className="input pl-9 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSystemGroups}
              onChange={(e) => setShowSystemGroups(e.target.checked)}
              className="rounded text-primary-600"
            />
            {t('groups.showSystem')}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {customCount} {t('groups.custom')} / {systemCount} {t('groups.system')}
          </span>
          <button
            onClick={() => {
              setEditingGroup(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            {t('groups.addGroup')}
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-8 text-center text-gray-500">{t('common.loading')}</div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-500">
            {search ? t('groups.noResults') : t('groups.noGroups')}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            return (
              <div
                key={group.id}
                className="card flex flex-col justify-between p-5 transition-shadow hover:shadow-md"
              >
                <div>
                  {/* Group Header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        group.isSystem
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'bg-primary-100 dark:bg-primary-900/30'
                      }`}>
                        <ShieldCheckIcon className={`h-4 w-4 ${
                          group.isSystem
                            ? 'text-gray-500'
                            : 'text-primary-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{group.name}</h3>
                        <p className="text-[10px] font-mono text-gray-400">{group.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.isSystem && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {t('groups.system')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{group.description}</p>
                  )}

                  {/* Permission Summary */}
                  <div className="mb-2">
                    <button
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span>
                        {group.permissions.length} {t('groups.permissions')}
                      </span>
                      {isExpanded ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      )}
                    </button>

                    {isExpanded ? (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-100 p-1.5 dark:border-gray-700">
                        {group.permissions.map((perm) => (
                          <span
                            key={perm.permissionCode}
                            className="mr-1 mb-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {perm.permissionCode}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {group.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm.permissionCode}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {perm.permissionCode}
                          </span>
                        ))}
                        {group.permissions.length > 3 && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700">
                            +{group.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
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
            );
          })
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
