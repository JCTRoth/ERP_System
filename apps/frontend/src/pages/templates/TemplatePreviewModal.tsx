import { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import * as templatesApi from '../../lib/api/templates';
import type { Template as ApiTemplate } from '../../lib/api/templates';

// GraphQL queries for master data
const GET_ORDERS = gql`
  query GetOrdersForTemplate {
    orders(first: 50) {
      nodes {
        id
        orderNumber
        status
      }
    }
  }
`;

const GET_INVOICES = gql`
  query GetInvoicesForTemplate {
    invoices(first: 50) {
      nodes {
        id
        invoiceNumber
        status
      }
    }
  }
`;

const GET_CUSTOMERS = gql`
  query GetCustomersForTemplate {
    customers(first: 50) {
      nodes {
        id
        name
        customerNumber
      }
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProductsForTemplate {
    products(first: 50) {
      nodes {
        id
        name
        sku
      }
    }
  }
`;

const GET_COMPANIES = gql`
  query GetCompaniesForTemplate {
    companies(first: 50) {
      nodes {
        id
        name
        code
      }
    }
  }
`;

interface TemplatePreviewModalProps {
  template: ApiTemplate;
  onClose: () => void;
}

export default function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps) {
  const { t } = useI18n();
  const [renderResult, setRenderResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Fetch master data
  const { data: ordersData, loading: ordersLoading } = useQuery(GET_ORDERS);
  const { data: invoicesData, loading: invoicesLoading } = useQuery(GET_INVOICES);
  const { data: customersData, loading: customersLoading } = useQuery(GET_CUSTOMERS);
  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS);
  const { data: companiesData, loading: companiesLoading } = useQuery(GET_COMPANIES);

  const orders = ordersData?.orders?.nodes || [];
  const invoices = invoicesData?.invoices?.nodes || [];
  const customers = customersData?.customers?.nodes || [];
  const products = productsData?.products?.nodes || [];
  const companies = companiesData?.companies?.nodes || [];

  const handleRender = async () => {
    try {
      setLoading(true);
      setRenderError(null);

      // Build context from selected records
      const context: Record<string, any> = {};
      if (selectedOrderId) {
        const order = orders.find((o: any) => String(o.id) === String(selectedOrderId));
        if (order) context.order = order;
      }
      if (selectedInvoiceId) {
        const invoice = invoices.find((inv: any) => String(inv.id) === String(selectedInvoiceId));
        if (invoice) context.invoice = invoice;
      }
      if (selectedCustomerId) {
        const customer = customers.find((c: any) => String(c.id) === String(selectedCustomerId));
        if (customer) context.customer = customer;
      }
      if (selectedProductId) {
        const product = products.find((p: any) => String(p.id) === String(selectedProductId));
        if (product) context.product = product;
      }
      if (selectedCompanyId) {
        const company = companies.find((co: any) => String(co.id) === String(selectedCompanyId));
        if (company) context.company = company;
      }

      const result = await templatesApi.renderTemplate(template.id, context);
      setRenderResult(result);
    } catch (err) {
      console.error('Failed to render template:', err);
      setRenderError(err instanceof Error ? err.message : 'Failed to render template');
    } finally {
      setLoading(false);
    }
  };

  // Auto-render when selections change
  useEffect(() => {
    handleRender();
  }, [selectedOrderId, selectedInvoiceId, selectedCustomerId, selectedProductId, selectedCompanyId]);

  const dataLoading = ordersLoading || invoicesLoading || customersLoading || productsLoading || companiesLoading;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose}></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl transform rounded-lg bg-white shadow-xl dark:bg-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('templates.preview')}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              {/* Loading State */}
              {dataLoading && (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-700">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-500"></div>
                  <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                </div>
              )}

              {/* Error Message */}
              {renderError && !loading && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {renderError}
                </div>
              )}

              {/* Master Data Selectors - 3 Column Grid */}
              {!dataLoading && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('templates.selectContext')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Companies */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{t('masterdata.companies')}</label>
                      <select
                        value={selectedCompanyId ?? ''}
                        onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('common.select')}</option>
                        {companies.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Customers */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{t('masterdata.customers')}</label>
                      <select
                        value={selectedCustomerId ?? ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('common.select')}</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Orders */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{t('nav.orders')}</label>
                      <select
                        value={selectedOrderId ?? ''}
                        onChange={(e) => setSelectedOrderId(e.target.value || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('common.select')}</option>
                        {orders.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Invoices */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{t('accounting.invoices')}</label>
                      <select
                        value={selectedInvoiceId ?? ''}
                        onChange={(e) => setSelectedInvoiceId(e.target.value || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('common.select')}</option>
                        {invoices.map((inv: any) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Products */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{t('nav.products')}</label>
                      <select
                        value={selectedProductId ?? ''}
                        onChange={(e) => setSelectedProductId(e.target.value || null)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('common.select')}</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Download Button */}
              {renderResult && renderResult.pdfUrl && !loading && (
                <div className="pt-4">
                  <a
                    href={renderResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    {t('common.view')} PDF
                  </a>
                </div>
              )}

              {/* Errors from render */}
              {renderResult && renderResult.errors && renderResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                    {t('common.error')}
                  </h3>
                  <ul className="space-y-1">
                    {renderResult.errors.map((error: string, idx: number) => (
                      <li key={idx} className="text-sm text-yellow-600 dark:text-yellow-400">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
