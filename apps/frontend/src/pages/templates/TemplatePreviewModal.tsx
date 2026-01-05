import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import * as templatesApi from '../../lib/api/templates';

interface Template {
  id: string;
  key: string;
  name: string;
  content: string;
}

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

export default function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps) {
  const { t } = useI18n();
  const [renderResult, setRenderResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleRender = async () => {
    try {
      setLoading(true);
      setRenderError(null);

      // Mock context data for preview
      const mockContext = {
        order: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          number: 'ORD-001',
          date: new Date().toISOString(),
          status: 'confirmed',
          customer: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
          },
          shippingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
            country: 'USA',
          },
          billingAddress: {
            street: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
            country: 'USA',
          },
          items: [
            {
              id: '1',
              product: { name: 'Product A', sku: 'SKU-001' },
              quantity: 2,
              unitPrice: 50,
              total: 100,
            },
            {
              id: '2',
              product: { name: 'Product B', sku: 'SKU-002' },
              quantity: 1,
              unitPrice: 75,
              total: 75,
            },
          ],
          subtotal: 175,
          tax: 17.5,
          shipping: 10,
          discount: 0,
          total: 202.5,
        },
        company: {
          name: 'ACME Corp',
          address: '456 Business Ave',
          city: 'New York',
          postalCode: '10001',
          country: 'USA',
          email: 'info@acme.com',
          phone: '+1234567890',
          website: 'www.acme.com',
        },
      };

      const result = await templatesApi.renderTemplate(template.id, mockContext);
      setRenderResult(result);
    } catch (err) {
      console.error('Failed to render template:', err);
      setRenderError(err instanceof Error ? err.message : 'Failed to render template');
    } finally {
      setLoading(false);
    }
  };

  // Auto-render on mount
  useEffect(() => {
    handleRender();
  }, [template.id]);

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
              {loading && (
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

              {/* Preview Results */}
              {renderResult && !loading && (
                <>
                  {/* HTML Preview */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t('templates.renderAsHtml')} {t('templates.preview')}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-700">
                      <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderResult.html }}
                      />
                    </div>
                  </div>

                  {/* PDF Download Link */}
                  {renderResult.pdfUrl && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('templates.renderAsPdf')}
                      </h3>
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

                  {/* Errors */}
                  {renderResult.errors && renderResult.errors.length > 0 && (
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
                </>
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
