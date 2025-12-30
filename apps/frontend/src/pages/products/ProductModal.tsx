import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import { shopApolloClient } from '../../lib/apollo';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      sku
      name
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: UUID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      sku
      name
    }
  }
`;

const GET_CATEGORIES = gql`
  query GetCategories {
    categories(first: 50) {
      nodes {
        id
        name
      }
    }
  }
`;

const GET_BRANDS = gql`
  query GetBrands {
    brands(first: 50) {
      nodes {
        id
        name
      }
    }
  }
`;

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  stockQuantity: number;
  status: string;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const { t } = useI18n();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    costPrice: '',
    stockQuantity: '',
    categoryId: '',
    brandId: '',
    isActive: true,
  });

  const { data: categoriesData } = useQuery(GET_CATEGORIES, { client: shopApolloClient });
  const { data: brandsData } = useQuery(GET_BRANDS, { client: shopApolloClient });

  const [createProduct, { loading: createLoading }] = useMutation(CREATE_PRODUCT, { client: shopApolloClient });
  const [updateProduct, { loading: updateLoading }] = useMutation(UPDATE_PRODUCT, { client: shopApolloClient });

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        compareAtPrice: product.compareAtPrice?.toString() || '',
        costPrice: product.costPrice.toString(),
        stockQuantity: product.stockQuantity.toString(),
        categoryId: product.category?.id || '',
        brandId: product.brand?.id || '',
        isActive: product.status === 'ACTIVE',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const input = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) || null : null,
        costPrice: parseFloat(formData.costPrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        trackInventory: true,
        allowBackorder: false,
        status: formData.isActive ? 'ACTIVE' : 'DRAFT',
        isFeatured: false,
        isDigital: false,
        categoryId: formData.categoryId || null,
        brandId: formData.brandId || null,
      };

      if (isEditing) {
        await updateProduct({
          variables: { id: product.id, input },
        });
      } else {
        await createProduct({
          variables: { input },
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      const message = error?.message || '';
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique') || message.toLowerCase().includes('sku')) {
        alert(t('products.duplicateSku') || 'A product with this SKU already exists. Please use a different SKU.');
      } else {
        alert(t('common.error') || 'An error occurred while saving the product.');
      }
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('products.editProduct') : t('products.addProduct')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.sku')} *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.name')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('products.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input mt-1 w-full"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.price')} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.compareAtPrice')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.compareAtPrice}
                onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.costPrice')} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.quantity')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="input mt-1 w-full"
                disabled={isEditing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.category')}
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="">{t('common.select')}</option>
                {categoriesData?.categories?.nodes?.map((cat: { id: string; name: string }) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('products.brand')}
              </label>
              <select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="">{t('common.select')}</option>
                {brandsData?.brands?.nodes?.map((brand: { id: string; name: string }) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              {t('products.isActive')}
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
