import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, Language } from '../../providers/I18nProvider';

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  isActive: boolean;
}

interface Props {
  user: User | null;
  onClose: () => void;
}

export default function UserModal({ user, onClose }: Props) {
  const { t } = useI18n();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    password: '',
    preferredLanguage: user?.preferredLanguage || 'en',
    isActive: user?.isActive ?? true,
  });

  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    onCompleted: onClose,
  });

  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    onCompleted: onClose,
  });

  const loading = creating || updating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      preferredLanguage: formData.preferredLanguage,
      isActive: formData.isActive,
      ...(formData.password && { password: formData.password }),
    };

    if (isEditing) {
      await updateUser({
        variables: { id: user.id, input },
      });
    } else {
      await createUser({
        variables: { input: { ...input, password: formData.password } },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? t('users.editUser') : t('users.addUser')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="label mb-1">
                {t('users.firstName')} *
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label mb-1">
                {t('users.lastName')} *
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="label mb-1">
              {t('users.email')} *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label mb-1">
              {t('users.password')} {!isEditing && '*'}
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              required={!isEditing}
              placeholder={isEditing ? t('users.passwordPlaceholder') : ''}
            />
          </div>

          <div>
            <label htmlFor="preferredLanguage" className="label mb-1">
              {t('users.language')}
            </label>
            <select
              id="preferredLanguage"
              value={formData.preferredLanguage}
              onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              className="input"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NAMES[lang]}
                </option>
              ))}
            </select>
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
