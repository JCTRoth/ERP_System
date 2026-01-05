const API_BASE = 'http://localhost:8087/api';

export interface Template {
  id: string;
  companyId: string;
  key: string;
  name: string;
  content: string;
  language: string;
  documentType: string;
  assignedState?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCreateRequest {
  key: string;
  name: string;
  content: string;
  language: string;
  documentType: string;
  assignedState?: string;
  companyId: string;
  createdBy: string;
}

export interface TemplateUpdateRequest {
  name?: string;
  content?: string;
  language?: string;
  documentType?: string;
  assignedState?: string;
}

export interface RenderResult {
  html: string;
  pdfUrl?: string;
  errors: string[];
}

export interface AvailableVariables {
  [category: string]: {
    [variable: string]: string;
  };
}

/**
 * Fetch all templates
 */
export async function getTemplates(
  companyId: string,
  language?: string,
  documentType?: string
): Promise<Template[]> {
  const params = new URLSearchParams();
  params.append('companyId', companyId);
  if (language) params.append('language', language);
  if (documentType) params.append('documentType', documentType);

  const response = await fetch(`${API_BASE}/templates?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single template by ID
 */
export async function getTemplate(id: string): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new template
 */
export async function createTemplate(request: TemplateCreateRequest): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to create template: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, request: TemplateUpdateRequest): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to update template: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }
}

/**
 * Render a template with context data
 */
export async function renderTemplate(id: string, contextJson: Record<string, any>): Promise<RenderResult> {
  const response = await fetch(`${API_BASE}/templates/${id}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contextJson),
  });
  if (!response.ok) {
    throw new Error(`Failed to render template: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Request a PDF for the template by POSTing JSON context. Returns a Blob (application/pdf).
 */
export async function getPdf(id: string, contextJson: Record<string, any>): Promise<Blob> {
  const response = await fetch(`${API_BASE}/templates/${id}/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contextJson),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get PDF: ${response.status} ${text}`);
  }
  return response.blob();
}

/**
 * Get available variables for template placeholders
 */
export async function getAvailableVariables(): Promise<AvailableVariables> {
  const response = await fetch(`${API_BASE}/templates/variables`);
  if (!response.ok) {
    throw new Error(`Failed to fetch available variables: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch context samples (orders, companies, invoices, shipments, cancellations, refunds)
 */
export async function getContextSamples(): Promise<Record<string, any[]>> {
  const response = await fetch(`${API_BASE}/templates/context-samples`);
  if (!response.ok) {
    throw new Error(`Failed to fetch context samples: ${response.statusText}`);
  }
  return response.json();
}
