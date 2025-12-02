import { AuditFields, Currency, DateRange } from './common.types';

/**
 * Supplier type definitions
 */

// ============================================================================
// SUPPLIER
// ============================================================================

export interface Supplier extends AuditFields {
  id: number;
  tally_id: string | null;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tin: string | null;
  bank_account: string | null;
  payment_terms: string | null; // e.g., "30 days"

  // Opening balances (from Tally)
  opening_balance_ugx: number; // Positive = we owe supplier
  opening_balance_usd: number;

  // Current balances (calculated)
  current_balance_ugx: number;
  current_balance_usd: number;

  // Status
  is_active: number;
}

// ============================================================================
// SUPPLIER FORMS
// ============================================================================

export interface SupplierFormData {
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  bank_account?: string;
  payment_terms?: string;

  // Opening balances
  opening_balance_ugx?: number;
  opening_balance_usd?: number;

  is_active?: number;
}

// ============================================================================
// SUPPLIER LEDGER
// ============================================================================

export interface SupplierLedgerEntry {
  id: number;
  date: string;
  transaction_type: 'Purchase' | 'Payment' | 'Adjustment';
  reference: string; // Purchase number, payment number, etc.
  description: string;
  currency: Currency;

  // Amounts
  debit: number; // Purchases, charges (increases payable)
  credit: number; // Payments (decreases payable)
  balance: number; // Running balance

  // Links
  invoice_id?: number;
  payment_id?: number;
}

export interface SupplierLedger {
  supplier: Supplier;
  entries: SupplierLedgerEntry[];
  opening_balance_ugx: number;
  opening_balance_usd: number;
  closing_balance_ugx: number;
  closing_balance_usd: number;
  total_purchases_ugx: number;
  total_purchases_usd: number;
  total_payments_ugx: number;
  total_payments_usd: number;
}

// ============================================================================
// SUPPLIER BALANCE
// ============================================================================

export interface SupplierBalance {
  supplier_id: number;
  supplier_name: string;

  // UGX
  balance_ugx: number; // Amount we owe

  // USD
  balance_usd: number;

  // Additional info
  last_payment_date?: string;
  days_outstanding?: number;
}

// ============================================================================
// FILTERS AND SORTING
// ============================================================================

export interface SupplierFilter {
  search?: string; // Search by name, company, phone
  balance_status?: 'all' | 'owing' | 'paid';
  is_active?: number;
  tally_id?: string;
}

export interface SupplierSort {
  field: 'name' | 'company_name' | 'current_balance_ugx' | 'created_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// REPORTS
// ============================================================================

export interface SupplierBalanceReport {
  suppliers: SupplierBalance[];
  total_payables_ugx: number;
  total_payables_usd: number;
  suppliers_count: number;
  suppliers_owing_count: number;
}

export interface SupplierLedgerFilters {
  supplier_id: number;
  date_range?: DateRange;
  currency?: Currency;
  transaction_type?: string;
}
