import { XMarkIcon, DocumentArrowDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import type { Template as ApiTemplate } from '../../lib/api/templates';
import { useTemplatePreview } from '../../hooks/useTemplatePreview';
import { buildTemplateContext } from '../../lib/templateUtils';
import * as templatesApi from '../../lib/api/templates';

interface TemplatePreviewModalProps {
  template: ApiTemplate;
  onClose: () => void;
}

export default function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps) {
  const { t } = useI18n();
  const { state, updateSelection } = useTemplatePreview(template);

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
                {t('templates.preview')} - {template.name}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Info Bar - Template Variables Reference */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-700">
              <div className="flex items-center gap-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('templates.variableInfoTitle') || 'Template Variables Available'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('templates.variableInfoSubtitle') || 'Use variables like {order.number}, {customer.name}, etc.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const variableDoc = `
== Template Variables Reference ==

Order: {order.number}, {order.date}, {order.total}
Customer: {customer.name}, {customer.email}
Company: {company.name}, {company.address}
Items Loop: {#order.items}{name} - {price}{#end}

Full docs: See README for complete variable list`;
                    alert(variableDoc);
                  }}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t('templates.viewAllVariables') || 'View All Variables'}
                </button>
              </div>
              {/* Quick variable examples */}
              <div className="mt-2 flex gap-4 overflow-x-auto pb-1">
                <span className="whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                  {'{order.number}'}
                </span>
                <span className="whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                  {'{customer.name}'}
                </span>
                <span className="whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                  {'{company.name}'}
                </span>
                <span className="whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                  {'{order.total}'}
                </span>
                <span className="whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                  {'{#order.items}'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
              {/* Loading State */}
              {state.dataLoading && (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-700">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-500"></div>
                  <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                </div>
              )}

              {/* Error Message */}
              {state.renderError && !state.loading && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {state.renderError}
                </div>
              )}

              {/* Master Data Selectors - Only show selectors that are actually needed */}
              {!state.dataLoading && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('templates.selectContext')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('templates.selectContextHint') || 'Select the data sources needed for this template. Customer/item data is automatically included from the selected invoice.'}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Companies - only show if required */}
                    {state.requiredFields.has('company') && (
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('masterdata.companies')}
                          <InformationCircleIcon className="h-3 w-3 text-blue-500" title="Required for template" />
                        </label>
                        <select
                          value={state.selectedIds.companyId ?? ''}
                          onChange={(e) => updateSelection('companyId', e.target.value || null)}
                          className={`block w-full rounded-md border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white ${
                            !state.selectedIds.companyId
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{t('common.select')}</option>
                          {state.masterData.companies.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name || c.slug}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Orders - only show if required */}
                    {state.requiredFields.has('order') && (
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('nav.orders')}
                          <InformationCircleIcon className="h-3 w-3 text-blue-500" title="Required for template" />
                        </label>
                        <select
                          value={state.selectedIds.orderId ?? ''}
                          onChange={(e) => updateSelection('orderId', e.target.value || null)}
                          className={`block w-full rounded-md border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white ${
                            !state.selectedIds.orderId
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{t('common.select')}</option>
                          {state.masterData.orders.map((o: any) => (
                            <option key={o.id} value={o.id}>
                              {o.orderNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Invoices - only show if required */}
                    {state.requiredFields.has('invoice') && (
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('accounting.invoices')}
                          <InformationCircleIcon className="h-3 w-3 text-blue-500" title="Required for template" />
                        </label>
                        <select
                          value={state.selectedIds.invoiceId ?? ''}
                          onChange={(e) => updateSelection('invoiceId', e.target.value || null)}
                          className={`block w-full rounded-md border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white ${
                            !state.selectedIds.invoiceId
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{t('common.select')}</option>
                          {state.masterData.invoices.map((inv: any) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Products - only show if required */}
                    {state.requiredFields.has('product') && (
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t('nav.products')}
                          <InformationCircleIcon className="h-3 w-3 text-blue-500" title="Required for template" />
                        </label>
                        <select
                          value={state.selectedIds.productId ?? ''}
                          onChange={(e) => updateSelection('productId', e.target.value || null)}
                          className={`block w-full rounded-md border px-2 py-1 text-sm dark:bg-gray-800 dark:text-white ${
                            !state.selectedIds.productId
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{t('common.select')}</option>
                          {state.masterData.products.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* Show note if no selectors are needed */}
                  {state.requiredFields.size === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {t('templates.noDataRequired') || 'This template does not require any data selection.'}
                    </p>
                  )}
                </div>
              )}

              {/* PDF Download Button: build context, request render (server returns pdfUrl) and open it */}
              {(!state.loading) && (
                <div className="pt-4 flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        // Build context from current selections
                        const context = buildTemplateContext(
                          {
                            companyId: state.selectedIds.companyId,
                            customerId: state.selectedIds.customerId,
                            invoiceId: state.selectedIds.invoiceId,
                            orderId: state.selectedIds.orderId,
                            productId: state.selectedIds.productId,
                          },
                          state.masterData,
                          state.fullRecords
                        );

                        try {
                          // Prefer POST /pdf to fetch the binary PDF
                          const pdfBlob = await templatesApi.getPdf(template.id, context);
                          if (pdfBlob && pdfBlob.type === 'application/pdf') {
                            const url = URL.createObjectURL(pdfBlob);
                            window.open(url, '_blank');
                            // revoke later
                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                          } else {
                            // Fallback: call renderTemplate and download HTML
                            const result = await templatesApi.renderTemplate(template.id, context);
                            if (result && result.html) {
                              const blob = new Blob([result.html], { type: 'text/html' });
                              const url2 = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url2;
                              const safeName = (template.name || 'preview').replace(/[^a-z0-9-_.]/gi, '_');
                              a.download = `${safeName}.html`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url2);
                            }
                          }
                        } catch (err) {
                          console.error('Failed to fetch PDF, falling back to HTML render:', err);
                          try {
                            const result = await templatesApi.renderTemplate(template.id, context);
                            if (result && result.html) {
                              const blob = new Blob([result.html], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              const safeName = (template.name || 'preview').replace(/[^a-z0-9-_.]/gi, '_');
                              a.download = `${safeName}.html`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            }
                          } catch (err2) {
                            console.error('Fallback render failed:', err2);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to generate/open PDF preview:', err);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    {t('templates.downloadPdf') || 'Download PDF'}
                  </button>
                  {/* also show any render errors from server */}
                  {state.renderResult && state.renderResult.errors && state.renderResult.errors.length > 0 && (
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      {state.renderResult.errors.map((err: string, i: number) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
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
