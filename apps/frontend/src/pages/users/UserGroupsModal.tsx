import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const ASSIGN_USER_GROUPS = gql`
  mutation AssignUserGroups($input: AssignUserGroupsInput!) {
    assignUserGroups(input: $input) {
      id
      code
      name
    }
  }
`;

interface GroupInfo {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

interface UserGroupsModalProps {
  userId: string;
  companyId: string;
  userName: string;
  availableGroups: GroupInfo[];
  onClose: () => void;
}

export default function UserGroupsModal({
  userId,
  companyId,
  userName,
  availableGroups,
  onClose,
}: UserGroupsModalProps) {
  const { t } = useI18n();
  useEscapeKey(onClose, true);

  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [assignGroups, { loading: saving }] = useMutation(ASSIGN_USER_GROUPS);

  // We don't have a direct query for user's current groups,
  // so we start with empty and let the admin set them.
  // The mutation replaces all groups for the user.

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedGroupIds(new Set(availableGroups.map((g) => g.id)));
  };

  const selectNone = () => {
    setSelectedGroupIds(new Set());
  };

  const handleSave = async () => {
    try {
      await assignGroups({
        variables: {
          input: {
            userId,
            companyId,
            groupIds: Array.from(selectedGroupIds),
          },
        },
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('members.groupAssignFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold">{t('members.manageGroups')}</h3>
            <p className="text-sm text-gray-500">{userName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('members.selectGroupsHint')}
            </p>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-primary-600 hover:underline dark:text-primary-400">
                {t('groups.selectAll')}
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={selectNone} className="text-primary-600 hover:underline dark:text-primary-400">
                {t('groups.selectNone')}
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {availableGroups.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">{t('groups.noGroups')}</p>
            ) : (
              availableGroups.map((group) => (
                <label
                  key={group.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                    selectedGroupIds.has(group.id)
                      ? 'bg-primary-50 dark:bg-primary-900/10'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="rounded text-primary-600"
                  />
                  <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{group.code}</span>
                  </div>
                  {group.isSystem && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700">
                      {t('groups.system')}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>

          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {t('members.groupAssignWarning')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary text-sm">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? t('common.saving') : t('members.saveGroups')}
          </button>
        </div>
      </div>
    </div>
  );
}
