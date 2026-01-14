import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { apolloClient as gatewayApolloClient } from '../lib/apollo';
import * as templatesApi from '../lib/api/templates';
import type { Template as ApiTemplate } from '../lib/api/templates';
import {
  GET_ORDERS,
  GET_INVOICES,
  GET_CUSTOMERS,
  GET_PRODUCTS,
  GET_COMPANIES,
  GET_SHOP_ORDER_DETAILS,
  GET_INVOICE_DETAILS,
  GET_CUSTOMER_DETAILS,
  GET_COMPANY_DETAILS,
  GET_PRODUCT_DETAILS,
  buildTemplateContext,
  extractUsedVariables,
  getRequiredContextFields,
} from '../lib/templateUtils';

export interface TemplatePreviewState {
  renderResult: any;
  loading: boolean;
  renderError: string | null;
  selectedIds: {
    companyId: string | null;
    customerId: string | null;
    invoiceId: string | null;
    orderId: string | null;
    productId: string | null;
  };
  fullRecords: {
    fullCompany: any | null;
    fullCustomer: any | null;
    fullInvoice: any | null;
    fullOrder: any | null;
    fullProduct: any | null;
  };
  masterData: {
    orders: any[];
    invoices: any[];
    customers: any[];
    products: any[];
    companies: any[];
  };
  requiredFields: Set<string>;
  dataLoading: boolean;
}

export function useTemplatePreview(template: ApiTemplate) {
  const [renderResult, setRenderResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState({
    companyId: null as string | null,
    customerId: null as string | null,
    invoiceId: null as string | null,
    orderId: null as string | null,
    productId: null as string | null,
  });
  const [fullRecords, setFullRecords] = useState({
    fullCompany: null as any,
    fullCustomer: null as any,
    fullInvoice: null as any,
    fullOrder: null as any,
    fullProduct: null as any,
  });
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());

  // Extract required fields from template content
  useEffect(() => {
    const usedVariables = extractUsedVariables(template.content);
    const required = getRequiredContextFields(usedVariables);
    setRequiredFields(required);
  }, [template.content]);

  // Fetch master data
  const { data: ordersData, loading: ordersLoading } = useQuery(GET_ORDERS);
  const { data: invoicesData, loading: invoicesLoading } = useQuery(GET_INVOICES);
  const { data: customersData, loading: customersLoading } = useQuery(GET_CUSTOMERS);
  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS);
  const { data: companiesData, loading: companiesLoading } = useQuery(GET_COMPANIES);

  const masterData = {
    orders: ordersData?.shopOrders?.nodes || [],
    invoices: invoicesData?.invoices?.nodes || [],
    customers: customersData?.customers?.nodes || [],
    products: productsData?.products?.nodes || [],
    companies: companiesData?.companies || [],
  };

  const dataLoading = ordersLoading || invoicesLoading || customersLoading || productsLoading || companiesLoading;

  // Fetch full records when a selection changes
  useEffect(() => {
    let mounted = true;

    async function fetchDetails() {
      try {
        const updates: Partial<typeof fullRecords> = {};

        // Fetch order details from shop (gatewayApolloClient)
        if (selectedIds.orderId) {
          try {
            const { data } = await gatewayApolloClient.query({
              query: GET_SHOP_ORDER_DETAILS,
              variables: { id: selectedIds.orderId },
              fetchPolicy: 'network-only'
            });
            if (mounted) updates.fullOrder = data?.shopOrder ?? null;
          } catch (orderError) {
            console.warn('Failed to fetch order details:', (orderError as Error).message);
            if (mounted) updates.fullOrder = null;
          }
        } else {
          if (mounted) updates.fullOrder = null;
        }

        // Fetch invoice details from accounting gateway
        if (selectedIds.invoiceId) {
          try {
            const { data } = await gatewayApolloClient.query({
              query: GET_INVOICE_DETAILS,
              variables: { id: selectedIds.invoiceId },
              fetchPolicy: 'network-only'
            });
            if (mounted) updates.fullInvoice = data?.invoice ?? null;
          } catch (invoiceError) {
            console.warn('Failed to fetch invoice details:', (invoiceError as Error).message);
            if (mounted) updates.fullInvoice = null;
          }
        } else {
          if (mounted) updates.fullInvoice = null;
        }

        // Fetch customer details from gateway (masterdata) only if we don't already have customer data
        if (selectedIds.customerId && !fullRecords.fullCustomer) {
          try {
            const { data } = await gatewayApolloClient.query({
              query: GET_CUSTOMER_DETAILS,
              variables: { customerNumber: selectedIds.customerId },
              fetchPolicy: 'network-only'
            });
            if (mounted) updates.fullCustomer = data?.customerByNumber ?? null;
          } catch (customerError) {
            // If customer fetch fails, don't set fullCustomer to null if we already have data from order
            // This preserves the auto-populated customer data from the template context builder
            if (!fullRecords.fullCustomer) {
              if (mounted) updates.fullCustomer = null;
            }
            // Log the error but don't rethrow - this is not critical for template preview
            console.warn('Failed to fetch customer details, using fallback data:', (customerError as Error).message);
          }
        } else {
          if (mounted) updates.fullCustomer = null;
        }

        // Fetch product details from shop
        if (selectedIds.productId) {
          try {
            const { data } = await gatewayApolloClient.query({
              query: GET_PRODUCT_DETAILS,
              variables: { id: selectedIds.productId },
              fetchPolicy: 'network-only'
            });
            if (mounted) updates.fullProduct = data?.product ?? null;
          } catch (productError) {
            console.warn('Failed to fetch product details:', (productError as Error).message);
            if (mounted) updates.fullProduct = null;
          }
        } else {
          if (mounted) updates.fullProduct = null;
        }

        // Fetch company details from gateway
        if (selectedIds.companyId) {
          try {
            const { data } = await gatewayApolloClient.query({
              query: GET_COMPANY_DETAILS,
              variables: { id: selectedIds.companyId },
              fetchPolicy: 'network-only'
            });
            if (mounted) updates.fullCompany = data?.company ?? null;
          } catch (companyError) {
            // Log the error but don't rethrow - this is not critical for template preview
            console.warn('Failed to fetch company details:', (companyError as Error).message);
            if (mounted) updates.fullCompany = null;
          }
        } else {
          if (mounted) updates.fullCompany = null;
        }

        if (mounted) {
          setFullRecords(prev => ({ ...prev, ...updates }));
        }
      } catch (err) {
        console.error('Failed to fetch detail records for template preview:', err);
      }
    }

    fetchDetails();

    return () => { mounted = false; };
  }, [selectedIds]);

  // Auto-render when selections change
  useEffect(() => {
    handleRender();
  }, [selectedIds, fullRecords]);

  const handleRender = async () => {
    try {
      setLoading(true);
      setRenderError(null);

      const context = buildTemplateContext(selectedIds, masterData, fullRecords);
      console.log('DEBUG: Template context being sent:', JSON.stringify(context, null, 2));
      const result = await templatesApi.renderTemplate(template.id, context);
      setRenderResult(result);
    } catch (err) {
      console.error('Failed to render template:', err);
      setRenderError(err instanceof Error ? err.message : 'Failed to render template');
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (field: keyof typeof selectedIds, value: string | null) => {
    setSelectedIds(prev => ({ ...prev, [field]: value }));
  };

  const state: TemplatePreviewState = {
    renderResult,
    loading,
    renderError,
    selectedIds,
    fullRecords,
    masterData,
    requiredFields,
    dataLoading,
  };

  return {
    state,
    updateSelection,
    handleRender,
  };
}