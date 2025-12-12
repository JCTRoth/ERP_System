import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

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

interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isDemo: boolean;
  isActive: boolean;
}

interface Props {
  company: Company | null;
  onClose: () => void;
}

export default function CompanyModal({ company, onClose }: Props) {
  const { t } = useI18n();
  const isEditing = !!company;

  const [formData, setFormData] = useState({
    name: company?.name || '',
    slug: company?.slug || '',
    description: company?.description || '',
    isActive: company?.isActive ?? true,
  });

  const [createCompany, { loading: creating }] = useMutation(CREATE_COMPANY, {
    onCompleted: onClose,
  });

  const [updateCompany, { loading: updating }] = useMutation(UPDATE_COMPANY, {
    onCompleted: onClose,
  });

  const loading = creating || updating;

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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? t('companies.editCompany') : t('companies.addCompany')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
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
      </div>
    </div>
  );
}
