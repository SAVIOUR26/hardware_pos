import { AuditFields, Currency, PaymentStatus, PaymentMethod, DateRange } from './common.types';
import { Product } from './product.types';
import { Supplier } from './supplier.types';

/**
 * Purchase type definitions
 */

// ============================================================================
// PURCHASE INVOICE
// ============================================================================

export interface PurchaseInvoice extends AuditFields {
  id: number;
  purchase_number: string; // Format: PUR-YYYYMMDD-0001
  supplier_id: number;
  supplier_invoice_number: string | null; // Supplier's bill number

  // Invoice details
  purchase_date: string;

  // Currency and amounts
  currency: Currency;
  exchange_rate: number;

  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_amount_ugx: number;

  // Payment tracking
  payment_status: PaymentStatus;
  amount_paid: number;
  payment_method: PaymentMethod | null;

  // Tally sync
  exported_to_tally: number;
  tally_export_date: string | null;
}

// Purchase invoice with related data
export interface PurchaseInvoiceWithDetails extends PurchaseInvoice {
  supplier: Supplier;
  items: PurchaseInvoiceItem[];
  total_items: number;
  total_quantity: number;
}

// ============================================================================
// PURCHASE INVOICE ITEMS
// ============================================================================

export interface PurchaseInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;

  // Item snapshot
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  line_total: number;

  // Option to update product cost price
  update_cost_price: number;

  created_at: string;
}

// Purchase invoice item with product details
export interface PurchaseInvoiceItemWithProduct extends PurchaseInvoiceItem {
  product: Product;
}

// ============================================================================
// PURCHASE FORMS
// ============================================================================

export interface PurchaseFormData {
  supplier_id: number;
  purchase_date: string;
  supplier_invoice_number?: string;
  currency: Currency;
  exchange_rate?: number; // Required if currency is USD

  items: PurchaseItemFormData[];

  // Payment details
  payment_status: PaymentStatus;
  amount_paid?: number;
  payment_method?: PaymentMethod;
}

export interface PurchaseItemFormData {
  product_id: number;
  quantity: number;
  unit_price: number;
  tax_percent?: number;
  update_cost_price?: boolean; // If true, update product.cost_price from this purchase
}

// ============================================================================
// FILTERS AND SORTING
// ============================================================================

export interface PurchaseFilter {
  search?: string; // Search by purchase number or supplier name
  supplier_id?: number;
  date_range?: DateRange;
  currency?: Currency;
  payment_status?: PaymentStatus;
  exported_to_tally?: number;
}

export interface PurchaseSort {
  field: 'purchase_number' | 'purchase_date' | 'supplier_name' | 'total_amount_ugx' | 'created_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface PurchaseStats {
  today_purchases_ugx: number;
  today_purchases_count: number;
  month_purchases_ugx: number;
  month_purchases_count: number;

  // Payment stats
  paid_amount_ugx: number;
  unpaid_amount_ugx: number; // Payables

  // Top suppliers
  top_suppliers: TopSupplier[];
}

export interface TopSupplier {
  supplier_id: number;
  supplier_name: string;
  total_purchases_ugx: number;
  invoice_count: number;
}
