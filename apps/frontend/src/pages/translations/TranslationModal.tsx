import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../providers/I18nProvider';

const CREATE_TRANSLATION_KEY = gql`
  mutation CreateTranslationKey($input: CreateTranslationKeyInput!) {
    createTranslationKey(input: $input) {
      id
      key
      namespace
    }
  }
`;

const UPDATE_TRANSLATION = gql`
  mutation UpdateTranslation($keyId: ID!, $language: String!, $value: String!) {
    updateTranslation(keyId: $keyId, language: $language, value: $value) {
      id
      value
    }
  }
`;

interface TranslationValue {
  language: string;
  value: string;
}

interface TranslationKey {
  id: string;
  key: string;
  namespace: string;
  values: TranslationValue[];
}

interface Props {
  translationKey: TranslationKey | null;
  onClose: () => void;
}

export default function TranslationModal({ translationKey, onClose }: Props) {
  const { t } = useI18n();
  const isEditing = !!translationKey;

  const [key, setKey] = useState(translationKey?.key || '');
  const [namespace, setNamespace] = useState(translationKey?.namespace || 'common');
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      initial[lang] = translationKey?.values.find((v) => v.language === lang)?.value || '';
    });
    return initial;
  });

  const [createKey, { loading: creating }] = useMutation(CREATE_TRANSLATION_KEY);
  const [updateTranslation, { loading: updating }] = useMutation(UPDATE_TRANSLATION);

  const loading = creating || updating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      // Update existing translations
      for (const lang of SUPPORTED_LANGUAGES) {
        if (values[lang]) {
          await updateTranslation({
            variables: {
              keyId: translationKey.id,
              language: lang,
              value: values[lang],
            },
          });
        }
      }
    } else {
      // Create new translation key with values
      await createKey({
        variables: {
          input: {
            key,
            namespace,
            values: SUPPORTED_LANGUAGES
              .filter((lang) => values[lang])
              .map((lang) => ({
                language: lang,
                value: values[lang],
              })),
          },
        },
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? t('translations.editKey') : t('translations.addKey')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="key" className="label mb-1">
                {t('translations.key')} *
              </label>
              <input
                id="key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="input font-mono"
                placeholder="nav.dashboard"
                required
                disabled={isEditing}
              />
            </div>
            <div>
              <label htmlFor="namespace" className="label mb-1">
                {t('translations.namespace')} *
              </label>
              <input
                id="namespace"
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="input"
                placeholder="common"
                required
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 font-medium">{t('translations.values')}</h3>
            <div className="space-y-3">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <div key={lang}>
                  <label htmlFor={`value-${lang}`} className="label mb-1">
                    {LANGUAGE_NAMES[lang]}
                  </label>
                  <input
                    id={`value-${lang}`}
                    type="text"
                    value={values[lang]}
                    onChange={(e) => setValues({ ...values, [lang]: e.target.value })}
                    className="input"
                    placeholder={`Translation in ${LANGUAGE_NAMES[lang]}`}
                  />
                </div>
              ))}
            </div>
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
