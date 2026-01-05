import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import ProductModal from './ProductModal';
import { shopApolloClient } from '../../lib/apollo';

const GET_PRODUCTS = gql`
  query GetProducts($first: Int, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        sku
        name
        price
        stockQuantity
        status
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: UUID!) {
    deleteProduct(id: $id)
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
  createdAt: string;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
}

export default function ProductsPage() {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
    variables: {
      first: 20,
    },
    errorPolicy: 'all',
    client: shopApolloClient,
  } as any);

  useEffect(() => {
    if (data) {
      console.log('Products query completed:', data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Products query error:', error);
    }
  }, [error]);

  const [deleteProduct] = useMutation(DELETE_PRODUCT, ({
    onCompleted: (data: any) => {
      if (data.deleteProduct) {
        refetch();
      } else {
        alert(t('products.deleteFailed'));
      }
    },
    onError: (error: any) => {
      console.error('Delete product error:', error);
      alert(t('products.deleteError'));
    },
    client: shopApolloClient,
  } as any));

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('products.confirmDelete'))) {
      await deleteProduct({ variables: { id } } as any);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    refetch();
  };

  const filteredProducts = data?.products?.nodes?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.status === 'ACTIVE') ||
      (statusFilter === 'inactive' && product.status !== 'ACTIVE');
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('products.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('products.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('products.addProduct')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('products.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">{t('common.all')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {error?.message?.includes('Unknown type') || error?.message?.includes('Cannot query field') ? (
          <div className="border border-yellow-200 bg-yellow-50 p-6 text-center dark:border-yellow-900/30 dark:bg-yellow-900/20">
            <h3 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-400">
              {t('common.serviceUnavailable')}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              The Products service is not yet available. This feature will be enabled when the shop service is deployed.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('products.product')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('products.sku')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('products.price')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('products.stock')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredProducts?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {t('products.noProducts')}
                  </td>
                </tr>
              ) : (
                filteredProducts?.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                      {product.sku}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <p className="font-medium">{formatCurrency(product.price)}</p>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <p className="text-sm text-gray-500 line-through">
                          {formatCurrency(product.compareAtPrice)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          product.stockQuantity <= 0
                            ? 'text-red-600'
                            : product.stockQuantity <= 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          product.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {product.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Info */}
        {!error?.message?.includes('Unknown type') && !error?.message?.includes('Cannot query field') && data?.products && (
          <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              {t('common.showing')} {filteredProducts?.length || 0} {t('common.of')}{' '}
              {data.products.totalCount} {t('products.products')}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
