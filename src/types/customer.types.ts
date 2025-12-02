import { AuditFields, Currency, DateRange } from './common.types';

/**
 * Customer type definitions
 */

// ============================================================================
// CUSTOMER
// ============================================================================

export interface Customer extends AuditFields {
  id: number;
  tally_id: string | null;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tin: string | null;

  // Opening balances (from Tally)
  opening_balance_ugx: number;
  opening_balance_usd: number;

  // Current balances (calculated)
  current_balance_ugx: number; // Positive = customer owes us
  current_balance_usd: number;

  // Advances (prepayments)
  advance_balance_ugx: number; // Negative balance = customer prepaid
  advance_balance_usd: number;

  // Credit limits
  credit_limit_ugx: number;
  credit_limit_usd: number;

  // Status
  is_active: number;
}

// ============================================================================
// CUSTOMER FORMS
// ============================================================================

export interface CustomerFormData {
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;

  // Opening balances (only when creating from Tally import)
  opening_balance_ugx?: number;
  opening_balance_usd?: number;

  // Credit limits
  credit_limit_ugx?: number;
  credit_limit_usd?: number;

  is_active?: number;
}

// ============================================================================
// CUSTOMER LEDGER
// ============================================================================

export interface CustomerLedgerEntry {
  id: number;
  date: string;
  transaction_type: 'Invoice' | 'Payment' | 'Advance' | 'Adjustment';
  reference: string; // Invoice number, receipt number, etc.
  description: string;
  currency: Currency;

  // Amounts
  debit: number; // Sales, charges
  credit: number; // Payments, returns
  balance: number; // Running balance

  // Links
  invoice_id?: number;
  payment_id?: number;
}

export interface CustomerLedger {
  customer: Customer;
  entries: CustomerLedgerEntry[];
  opening_balance_ugx: number;
  opening_balance_usd: number;
  closing_balance_ugx: number;
  closing_balance_usd: number;
  total_sales_ugx: number;
  total_sales_usd: number;
  total_payments_ugx: number;
  total_payments_usd: number;
}

// ============================================================================
// CUSTOMER BALANCE
// ============================================================================

export interface CustomerBalance {
  customer_id: number;
  customer_name: string;

  // UGX
  balance_ugx: number;
  advance_balance_ugx: number;
  credit_limit_ugx: number;
  available_credit_ugx: number; // credit_limit - balance

  // USD
  balance_usd: number;
  advance_balance_usd: number;
  credit_limit_usd: number;
  available_credit_usd: number;

  // Status
  is_over_limit: boolean;
  days_overdue?: number;
}

// ============================================================================
// FILTERS AND SORTING
// ============================================================================

export interface CustomerFilter {
  search?: string; // Search by name, company, phone
  balance_status?: 'all' | 'owing' | 'advance' | 'zero';
  is_active?: number;
  tally_id?: string;
}

export interface CustomerSort {
  field: 'name' | 'company_name' | 'current_balance_ugx' | 'created_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// REPORTS
// ============================================================================

export interface CustomerBalanceReport {
  customers: CustomerBalance[];
  total_receivables_ugx: number;
  total_receivables_usd: number;
  total_advances_ugx: number;
  total_advances_usd: number;
  customers_count: number;
  customers_owing_count: number;
}

export interface CustomerLedgerFilters {
  customer_id: number;
  date_range?: DateRange;
  currency?: Currency;
  transaction_type?: string;
}
