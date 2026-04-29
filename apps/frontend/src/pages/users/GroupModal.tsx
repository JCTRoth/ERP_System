import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { AuthGroup } from './GroupsTab';

const UPSERT_GROUP = gql`
  mutation UpsertGroup($input: UpsertAuthorizationGroupInput!) {
    upsertGroup(input: $input) {
      id
      code
      name
      description
      isSystem
      permissions {
        permissionCode
        scopeType
        scopeJson
      }
    }
  }
`;

const GET_PERMISSIONS_CATALOG = gql`
  query GetPermissionsCatalog {
    permissionsCatalog {
      id
      code
      resource
      operation
      description
    }
  }
`;

interface Permission {
  id: string;
  code: string;
  resource: string;
  operation: string;
  description: string;
}

interface GroupModalProps {
  group: AuthGroup | null;
  companyId: string;
  onClose: () => void;
}

export default function GroupModal({ group, companyId, onClose }: GroupModalProps) {
  const { t } = useI18n();
  useEscapeKey(onClose, true);

  const [name, setName] = useState(group?.name ?? '');
  const [code, setCode] = useState(group?.code ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(group?.permissions.map((p) => p.permissionCode) ?? [])
  );
  const [error, setError] = useState<string | null>(null);

  const { data: permData } = useQuery(GET_PERMISSIONS_CATALOG);
  const [upsertGroup, { loading: saving }] = useMutation(UPSERT_GROUP);

  const permissions: Permission[] = permData?.permissionsCatalog ?? [];
  const isEditing = !!group;
  const isSystem = group?.isSystem ?? false;

  // Auto-generate code from name for new groups
  useEffect(() => {
    if (!isEditing && name) {
      setCode(name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''));
    }
  }, [name, isEditing]);

  // Group permissions by resource
  const permissionsByResource = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleResource = (resource: string) => {
    const resourcePerms = permissionsByResource[resource] ?? [];
    const allSelected = resourcePerms.every((p) => selectedPermissions.has(p.code));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      for (const p of resourcePerms) {
        if (allSelected) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPermissions(new Set(permissions.map((p) => p.code)));
  };

  const selectNone = () => {
    setSelectedPermissions(new Set());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('groups.nameRequired'));
      return;
    }

    try {
      await upsertGroup({
        variables: {
          input: {
            id: group?.id ?? undefined,
            companyId,
            code: code || name.toUpperCase().replace(/\s+/g, '_'),
            name: name.trim(),
            description: description.trim() || null,
            permissions: Array.from(selectedPermissions).map((permCode) => ({
              permissionCode: permCode,
              scopeType: 'COMPANY',
            })),
          },
        },
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('groups.saveFailed'));
    }
  };

  const resourceLabels: Record<string, string> = {
    'company.company': t('groups.permResource.company'),
    'company.assignment': t('groups.permResource.assignment'),
    'company.group': t('groups.permResource.groups'),
    'user.user': t('groups.permResource.users'),
    'shop.product': t('groups.permResource.products'),
    'orders.order': t('groups.permResource.orders'),
    'accounting.record': t('groups.permResource.accounting'),
    'masterdata.record': t('groups.permResource.masterdata'),
    'translation.translation': t('groups.permResource.translations'),
    'template.template': t('groups.permResource.templates'),
    'notification.notification': t('groups.permResource.notifications'),
    'scripting.script': t('groups.permResource.scripting'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? t('groups.editGroup') : t('groups.createGroup')}
            </h2>
            {isSystem && (
              <p className="text-xs text-amber-600">{t('groups.systemGroupWarning')}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1">{t('groups.name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder={t('groups.namePlaceholder')}
                disabled={isSystem}
              />
            </div>
            <div>
              <label className="label mb-1">{t('groups.code')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input font-mono text-sm"
                placeholder="AUTO_GENERATED"
                disabled={isSystem || isEditing}
              />
            </div>
            <div className="col-span-2">
              <label className="label mb-1">{t('groups.description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[60px]"
                placeholder={t('groups.descriptionPlaceholder')}
              />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{t('groups.permissions')}</h3>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary-600 hover:underline dark:text-primary-400"
                >
                  {t('groups.selectAll')}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-primary-600 hover:underline dark:text-primary-400"
                >
                  {t('groups.selectNone')}
                </button>
                <span className="ml-2 text-gray-400">
                  {selectedPermissions.size}/{permissions.length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(permissionsByResource).map(([resource, perms]) => {
                const allSelected = perms.every((p) => selectedPermissions.has(p.code));
                const someSelected = perms.some((p) => selectedPermissions.has(p.code));

                return (
                  <div key={resource} className="rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 dark:bg-gray-700/50">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => toggleResource(resource)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">
                        {resourceLabels[resource] || resource}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        {perms.filter((p) => selectedPermissions.has(p.code)).length}/{perms.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {perms.map((perm) => (
                        <label
                          key={perm.code}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(perm.code)}
                            onChange={() => togglePermission(perm.code)}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{perm.description || perm.code}</span>
                            <span className="ml-2 text-xs text-gray-400 font-mono">{perm.operation}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? t('common.saving') : isEditing ? t('common.save') : t('groups.createGroup')}
          </button>
        </div>
      </div>
    </div>
  );
}
