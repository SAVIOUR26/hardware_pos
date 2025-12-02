import { AuditFields, Currency, PaymentMethod, PaymentType, TransactionType, DateRange } from './common.types';

/**
 * Payment and Cash Transaction type definitions
 */

// ============================================================================
// PAYMENT / RECEIPT
// ============================================================================

export interface Payment extends AuditFields {
  id: number;
  payment_number: string; // Format: RCT-YYYYMMDD-0001 or PAY-YYYYMMDD-0001
  payment_type: PaymentType; // Receipt (from customer) or Payment (to supplier)

  // Party
  customer_id: number | null;
  supplier_id: number | null;

  // Linked invoice (optional)
  sales_invoice_id: number | null;
  purchase_invoice_id: number | null;

  // Payment details
  payment_date: string;
  currency: Currency;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null; // Transaction ID, check number, etc.
  notes: string | null;

  // Tally sync
  exported_to_tally: number;
}

// Payment with related data
export interface PaymentWithDetails extends Payment {
  party_name: string; // Customer or supplier name
  invoice_number?: string; // If linked to invoice
}

// ============================================================================
// PAYMENT FORMS
// ============================================================================

export interface PaymentFormData {
  payment_type: PaymentType;
  customer_id?: number; // Required if type = Receipt
  supplier_id?: number; // Required if type = Payment
  sales_invoice_id?: number; // Optional - link to invoice
  purchase_invoice_id?: number; // Optional - link to invoice

  payment_date: string;
  currency: Currency;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

// ============================================================================
// CASH TRANSACTIONS (Cash Book)
// ============================================================================

export interface CashTransaction extends AuditFields {
  id: number;

  // Transaction details
  transaction_date: string;
  transaction_type: TransactionType; // Receipt, Payment, Deposit, Withdrawal
  currency: Currency;
  amount: number;

  // Description
  description: string;
  reference: string | null;

  // Linked records
  payment_id: number | null;
  sales_invoice_id: number | null;
  purchase_invoice_id: number | null;

  // Balance tracking
  balance: number | null; // Running balance after this transaction
}

// Cash transaction with details
export interface CashTransactionWithDetails extends CashTransaction {
  party_name?: string; // Customer/supplier name if applicable
}

// ============================================================================
// CASH BOOK
// ============================================================================

export interface CashBook {
  currency: Currency;
  transactions: CashTransactionWithDetails[];
  opening_balance: number;
  total_receipts: number;
  total_payments: number;
  closing_balance: number;
  date_range: DateRange;
}

export interface CashBookSummary {
  ugx: {
    opening_balance: number;
    total_receipts: number;
    total_payments: number;
    closing_balance: number;
  };
  usd: {
    opening_balance: number;
    total_receipts: number;
    total_payments: number;
    closing_balance: number;
  };
}

// ============================================================================
// FILTERS
// ============================================================================

export interface PaymentFilter {
  search?: string;
  payment_type?: PaymentType;
  customer_id?: number;
  supplier_id?: number;
  date_range?: DateRange;
  currency?: Currency;
  payment_method?: PaymentMethod;
  exported_to_tally?: number;
}

export interface CashTransactionFilter {
  date_range?: DateRange;
  currency?: Currency;
  transaction_type?: TransactionType;
  search?: string;
}
