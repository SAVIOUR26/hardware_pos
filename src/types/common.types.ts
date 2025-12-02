/**
 * Common type definitions used across the application
 */

// ============================================================================
// ENUMS AND LITERALS
// ============================================================================

export type Currency = 'UGX' | 'USD';

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export type DeliveryStatus = 'Not Taken' | 'Partially Taken' | 'Taken';

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank' | 'Credit';

export type UserRole = 'admin' | 'manager' | 'user';

export type DocumentType = 'invoice' | 'quotation' | 'delivery_note' | 'receipt';

export type PaymentType = 'Receipt' | 'Payment';

export type TransactionType = 'Receipt' | 'Payment' | 'Deposit' | 'Withdrawal';

export type TallySyncType = 'Import Masters' | 'Export Vouchers';

export type TallySyncStatus = 'Success' | 'Failed' | 'Partial';

// ============================================================================
// PAGINATION AND FILTERING
// ============================================================================

export interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  [key: string]: any;
}

export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ============================================================================
// AUDIT FIELDS
// ============================================================================

export interface AuditFields {
  created_at: string;
  updated_at?: string;
  created_by?: number;
}

// ============================================================================
// COMMON MONEY TYPES
// ============================================================================

export interface Money {
  amount: number;
  currency: Currency;
}

export interface DualCurrencyAmount {
  ugx: number;
  usd: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// CHART DATA
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

// ============================================================================
// FILE
// ============================================================================

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
}
