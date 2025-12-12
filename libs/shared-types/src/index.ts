// ERP System Shared Types
// This library contains TypeScript types shared across frontend and services

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  preferredLanguage: string;
  darkMode: boolean;
  isApiUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompanyAssignment {
  userId: string;
  companyId: string;
  role: UserRole;
  assignedAt: string;
}

export interface AuthContext {
  userId: string;
  companyId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  language: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  companies: CompanyBrief[];
}

export interface CompanySelectRequest {
  companyId: string;
}

// ============================================================================
// Company Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  settingsJson: Record<string, unknown>;
  isDemo: boolean;
  createdAt: string;
}

export interface CompanyBrief {
  id: string;
  name: string;
  logoUrl?: string;
  isDemo: boolean;
  userRole: UserRole;
}

export interface CompanySettings {
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  customSettings?: Record<string, unknown>;
}

// ============================================================================
// Dynamic Field Types
// ============================================================================

export type DynamicFieldType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'DATETIME' 
  | 'ENUM' 
  | 'JSON';

export type EntityType = 
  | 'CUSTOMER' 
  | 'PRODUCT' 
  | 'ORDER' 
  | 'INVOICE' 
  | 'SUPPLIER'
  | 'CUSTOM';

export interface DynamicFieldDefinition {
  id: string;
  companyId: string;
  entityType: EntityType;
  fieldName: string;
  fieldType: DynamicFieldType;
  validationRules: ValidationRules;
  displayOrder: number;
  createdAt: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
}

export interface DynamicFieldValue {
  id: string;
  definitionId: string;
  entityId: string;
  valueJson: unknown;
}

// ============================================================================
// Translation Types
// ============================================================================

export type TranslationSource = 'SYSTEM' | 'DYNAMIC_PAGE' | 'CUSTOM';

export interface TranslationKey {
  id: string;
  keyCode: string;
  source: TranslationSource;
  description?: string;
  createdAt: string;
}

export interface TranslationValue {
  id: string;
  keyId: string;
  languageCode: string;
  value: string;
  companyId?: string;
  updatedAt: string;
}

export interface TranslationExport {
  exportedAt: string;
  language: string;
  companyId: string | null;
  keys: Record<string, {
    value: string | null;
    source: TranslationSource;
    description?: string;
  }>;
}

export interface TranslationImport {
  language: string;
  companyId: string | null;
  keys: Record<string, string>;
}

export interface LanguageConfig {
  code: string;
  flag: string;
  name: string;
}

// ============================================================================
// Shop Types
// ============================================================================

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  categoryId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  dynamicFields?: Record<string, unknown>;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
  displayOrder: number;
  createdAt: string;
}

export interface Order {
  id: string;
  companyId: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'DELIVERED' 
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ============================================================================
// Accounting Types
// ============================================================================

export interface UserBalance {
  userId: string;
  companyId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  userId: string;
  companyId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
  createdAt: string;
}

export type TransactionType = 
  | 'PURCHASE' 
  | 'PAYMENT' 
  | 'REFUND' 
  | 'ADJUSTMENT';

export interface PaymentRequest {
  amount: number;
  method: PaymentMethod;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEMO';

// ============================================================================
// Masterdata / EDIFACT Types
// ============================================================================

export type EdifactMessageType = 'PRICAT' | 'PRODAT' | 'UTILMD';

export interface EdifactImportRequest {
  messageType: EdifactMessageType;
  content: string;
}

export interface EdifactExportRequest {
  messageType: EdifactMessageType;
  entityIds: string[];
}

// ============================================================================
// UI Builder Types
// ============================================================================

export type UIComponentType = 
  | 'BUTTON' 
  | 'INPUT' 
  | 'SELECT' 
  | 'CHECKBOX' 
  | 'TABLE' 
  | 'CHART' 
  | 'TEXT' 
  | 'CONTAINER'
  | 'FORM';

export interface UIComponent {
  id: string;
  type: UIComponentType;
  props: Record<string, unknown>;
  children?: UIComponent[];
  scripts?: UIScript[];
  translationKey?: string;
}

export interface UIScript {
  id: string;
  event: string;
  code: string;
  isServerSide: boolean;
}

export interface CustomPage {
  id: string;
  companyId: string;
  slug: string;
  title: string;
  components: UIComponent[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationRequest {
  userId: string;
  templateKey: string;
  params: Record<string, string>;
  channel: NotificationChannel;
}

export type NotificationChannel = 'EMAIL' | 'IN_APP';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
