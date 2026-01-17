import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_UNIT_OF_MEASURE = gql`
  mutation CreateUnitOfMeasure($input: CreateUnitOfMeasureInput!) {
    createUnitOfMeasure(input: $input) {
      id
      code
      name
    }
  }
`;

const UPDATE_UNIT_OF_MEASURE = gql`
  mutation UpdateUnitOfMeasure($id: UUID!, $input: UpdateUnitOfMeasureInput!) {
    updateUnitOfMeasure(id: $id, input: $input) {
      id
      code
      name
    }
  }
`;

export interface UnitOfMeasureData {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  type: string;
  baseUnitId: string | null;
  conversionFactor: number;
  isBaseUnit: boolean;
  isActive: boolean;
}

interface UnitOfMeasureModalProps {
  unitOfMeasure: UnitOfMeasureData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UnitOfMeasureModal({ unitOfMeasure, onClose, onSuccess }: UnitOfMeasureModalProps) {
  const { t } = useI18n();
  const isEditing = !!unitOfMeasure;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    type: 'Unit',
    baseUnitId: '',
    conversionFactor: 1,
    isBaseUnit: false,
  });

  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureData[]>([]);

  const [createUnitOfMeasure, { loading: createLoading }] = useMutation(CREATE_UNIT_OF_MEASURE, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updateUnitOfMeasure, { loading: updateLoading }] = useMutation(UPDATE_UNIT_OF_MEASURE, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  // Load units for base unit selection
  useEffect(() => {
    // For simplicity, we'll hardcode some common units or load from query
    // In a real app, you'd use the GET_UNITS_OF_MEASURE query
    setUnitsOfMeasure([
      { id: '1', code: 'EA', name: 'Each', type: 'Unit', isBaseUnit: true } as UnitOfMeasureData,
      { id: '2', code: 'KG', name: 'Kilogram', type: 'Weight', isBaseUnit: true } as UnitOfMeasureData,
      { id: '3', code: 'M', name: 'Meter', type: 'Length', isBaseUnit: true } as UnitOfMeasureData,
      { id: '4', code: 'L', name: 'Liter', type: 'Volume', isBaseUnit: true } as UnitOfMeasureData,
    ]);
  }, []);

  useEffect(() => {
    if (unitOfMeasure) {
      setFormData({
        code: unitOfMeasure.code,
        name: unitOfMeasure.name,
        symbol: unitOfMeasure.symbol || '',
        type: unitOfMeasure.type || 'Unit',
        baseUnitId: unitOfMeasure.baseUnitId || '',
        conversionFactor: unitOfMeasure.conversionFactor,
        isBaseUnit: unitOfMeasure.isBaseUnit,
      });
    }
  }, [unitOfMeasure]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateUnitOfMeasure({
          variables: {
            id: unitOfMeasure.id,
            input: {
              name: formData.name || undefined,
              symbol: formData.symbol || undefined,
              conversionFactor: formData.conversionFactor,
              isActive: true, // Assuming we keep it active for now
            },
          },
        });
      } else {
        await createUnitOfMeasure({
          variables: {
            input: {
              code: formData.code,
              name: formData.name,
              symbol: formData.symbol || undefined,
              type: formData.type,
              baseUnitId: undefined, // TODO: implement proper base unit selection
              conversionFactor: formData.conversionFactor,
              isBaseUnit: formData.isBaseUnit,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error saving unit of measure:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('common.edit') + ' ' + t('masterdata.unitsOfMeasure') : t('common.add') + ' ' + t('masterdata.unitsOfMeasure')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.code')} *
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input mt-1 w-full"
              placeholder="PCS"
              maxLength={20}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.name')} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input mt-1 w-full"
              placeholder="Pieces"
            />
          </div>

          {/* Symbol and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.symbol')}
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="input mt-1 w-full"
                placeholder="pcs"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.type')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="Unit">{t('masterdata.uomType.unit') || 'Unit'}</option>
                <option value="Weight">{t('masterdata.uomType.weight') || 'Weight'}</option>
                <option value="Length">{t('masterdata.uomType.length') || 'Length'}</option>
                <option value="Volume">{t('masterdata.uomType.volume') || 'Volume'}</option>
                <option value="Time">{t('masterdata.uomType.time') || 'Time'}</option>
                <option value="Area">{t('masterdata.uomType.area') || 'Area'}</option>
              </select>
            </div>
          </div>

          {/* Base Unit and Conversion Factor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.baseUnit')}
              </label>
              <select
                value={formData.baseUnitId}
                onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                className="input mt-1 w-full"
                disabled={formData.isBaseUnit}
              >
                <option value="">{t('common.none')}</option>
                {unitsOfMeasure
                  .filter(u => u.type === formData.type && u.isBaseUnit)
                  .map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.conversionFactor')} *
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData.conversionFactor}
                onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                className="input mt-1 w-full"
                disabled={formData.isBaseUnit}
              />
            </div>
          </div>

          {/* Is Base Unit */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBaseUnit"
              checked={formData.isBaseUnit}
              onChange={(e) => setFormData({ ...formData, isBaseUnit: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isBaseUnit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('masterdata.isBaseUnit') || 'Is Base Unit'}
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}