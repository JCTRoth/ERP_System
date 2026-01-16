import { useState, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../providers/I18nProvider";
import Tooltip from "../../components/Tooltip";

const CREATE_ASSET = gql`
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
      id
      assetNumber
      name
    }
  }
`;

const UPDATE_ASSET = gql`
  mutation UpdateAsset($id: UUID!, $input: UpdateAssetInput!) {
    updateAsset(id: $id, input: $input) {
      id
      assetNumber
      name
    }
  }
`;

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  purchaseDate: string | null;
  purchasePrice: number;
  currentValue: number;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

interface AssetModalProps {
  asset: Asset | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AssetModal({
  asset,
  onClose,
  onSuccess,
}: AssetModalProps) {
  const { t } = useI18n();
  const isEditing = !!asset;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "Equipment",
    status: "Active",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: 0,
    currentValue: 0,
    notes: "",
  });

  const [createAsset, { loading: createLoading }] = useMutation(CREATE_ASSET, {
    errorPolicy: "all",
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updateAsset, { loading: updateLoading }] = useMutation(UPDATE_ASSET, {
    errorPolicy: "all",
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        description: asset.description || "",
        type: asset.type || "Equipment",
        status: asset.status || "Active",
        purchaseDate: asset.purchaseDate
          ? asset.purchaseDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        purchasePrice: asset.purchasePrice,
        currentValue: asset.currentValue,
        notes: "",
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isoPurchaseDate = formData.purchaseDate
        ? new Date(formData.purchaseDate).toISOString()
        : new Date().toISOString();

      const input = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        purchasePrice: formData.purchasePrice,
        purchaseDate: isoPurchaseDate,
        salvageValue: null,
        usefulLifeMonths: 60,
        depreciationMethod: null,
        currency: "EUR",
        serialNumber: null,
        barcode: null,
        manufacturer: null,
        model: null,
        assignedToId: null,
        departmentId: null,
        locationId: null,
        costCenterId: null,
        warrantyExpiry: null,
        notes: formData.notes || null,
      };

      if (isEditing) {
        await updateAsset({
          variables: {
            id: asset.id,
            input: {
              name: input.name!,
              description: input.description,
              type: input.type,
              status: formData.status,
              currentValue: formData.currentValue,
              salvageValue: input.salvageValue,
              usefulLifeMonths: input.usefulLifeMonths,
              depreciationMethod: input.depreciationMethod,
              serialNumber: input.serialNumber,
              barcode: input.barcode,
              manufacturer: input.manufacturer,
              model: input.model,
              assignedToId: input.assignedToId,
              departmentId: input.departmentId,
              locationId: input.locationId,
              costCenterId: input.costCenterId,
              warrantyExpiry: input.warrantyExpiry,
              lastMaintenanceDate: null,
              nextMaintenanceDate: null,
              notes: input.notes,
            },
          },
        });
      } else {
        await createAsset({ variables: { input } });
      }
    } catch (error) {
      console.error("Error saving asset:", error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t("masterdata.editAsset") : t("masterdata.addAsset")}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t("common.close")}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("masterdata.name")} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input mt-1 w-full"
              placeholder={
                t("masterdata.assetNamePlaceholder") || "Enter asset name"
              }
            />
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("masterdata.type")} *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="input mt-1 w-full"
              >
                <option value="Equipment">
                  {t("masterdata.assetType.equipment")}
                </option>
                <option value="Vehicle">
                  {t("masterdata.assetType.vehicle")}
                </option>
                <option value="Furniture">
                  {t("masterdata.assetType.furniture")}
                </option>
                <option value="Computer">
                  {t("masterdata.assetType.computer")}
                </option>
                <option value="Software">
                  {t("masterdata.assetType.software")}
                </option>
                <option value="Building">
                  {t("masterdata.assetType.building")}
                </option>
                <option value="Land">{t("masterdata.assetType.land")}</option>
                <option value="Machinery">
                  {t("masterdata.assetType.machinery")}
                </option>
                <option value="IntangibleAsset">
                  {t("masterdata.assetType.intangibleAsset")}
                </option>
                <option value="Other">{t("masterdata.assetType.other")}</option>
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("common.status")}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="input mt-1 w-full"
                >
                  <option value="ACTIVE">{t("common.active")}</option>
                  <option value="MAINTENANCE">
                    {t("masterdata.maintenance")}
                  </option>
                  <option value="DISPOSED">{t("masterdata.disposed")}</option>
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("common.description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input mt-1 w-full"
              rows={2}
            />
          </div>

          {/* Purchase Date and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("masterdata.purchased")}
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
                className="input mt-1 w-full"
              />
            </div>
            <div />
          </div>

          {/* Purchase Price and Current Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Tooltip
                content={
                  t("masterdata.purchasePriceTooltip") ||
                  "Original purchase price"
                }
                position="top"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("masterdata.purchasePrice") || "Purchase Price"}
                </label>
              </Tooltip>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchasePrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <Tooltip
                content={
                  t("masterdata.currentValueTooltip") ||
                  "Current book value after depreciation"
                }
                position="top"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("masterdata.currentValue") || "Current Value"}
                </label>
              </Tooltip>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("masterdata.notes")}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="input mt-1 w-full"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
