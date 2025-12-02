import { AuditFields, Currency, PaymentStatus, DeliveryStatus, PaymentMethod, DateRange } from './common.types';
import { Product } from './product.types';
import { Customer } from './customer.types';

/**
 * Sales type definitions
 * ⭐ Includes critical "Not Taken" workflow
 */

// ============================================================================
// SALES INVOICE
// ============================================================================

export interface SalesInvoice extends AuditFields {
  id: number;
  invoice_number: string; // Format: INV-YYYYMMDD-0001
  customer_id: number;

  // Invoice details
  invoice_date: string;
  is_quotation: number; // 0 = Invoice, 1 = Quotation
  quotation_id: number | null;

  // Currency and amounts
  currency: Currency;
  exchange_rate: number; // USD to UGX rate

  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number; // In original currency
  total_amount_ugx: number; // Converted to UGX

  // Payment tracking
  payment_status: PaymentStatus;
  amount_paid: number;
  payment_method: PaymentMethod | null;

  // Delivery tracking ⭐ KEY FEATURE
  delivery_status: DeliveryStatus; // Not Taken, Partially Taken, Taken
  expected_collection_date: string | null;
  collection_notes: string | null;

  // Tally sync
  exported_to_tally: number;
  tally_export_date: string | null;
}

// Sales invoice with related data
export interface SalesInvoiceWithDetails extends SalesInvoice {
  customer: Customer;
  items: SalesInvoiceItem[];
  total_items: number;
  total_quantity: number;
}

// ============================================================================
// SALES INVOICE ITEMS
// ============================================================================

export interface SalesInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;

  // Item snapshot
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;

  // Delivery tracking per item ⭐
  delivery_status: DeliveryStatus;
  quantity_delivered: number; // How much has been collected

  created_at: string;
}

// Sales invoice item with product details
export interface SalesInvoiceItemWithProduct extends SalesInvoiceItem {
  product: Product;
  quantity_remaining: number; // quantity - quantity_delivered
}

// ============================================================================
// SALES FORMS
// ============================================================================

export interface SalesFormData {
  customer_id: number;
  invoice_date: string;
  currency: Currency;
  exchange_rate?: number; // Required if currency is USD
  expected_collection_date?: string;
  collection_notes?: string;

  items: SalesItemFormData[];

  // Payment details (if paid/partial)
  payment_status: PaymentStatus;
  amount_paid?: number;
  payment_method?: PaymentMethod;
}

export interface SalesItemFormData {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
}

// Quotation form (similar to sales but is_quotation = 1)
export interface QuotationFormData extends Omit<SalesFormData, 'payment_status' | 'amount_paid' | 'payment_method'> {
  valid_until?: string; // Quotation expiry date
}

// ============================================================================
// "NOT TAKEN" WORKFLOW ⭐
// ============================================================================

export interface NotTakenReportItem {
  invoice: SalesInvoiceWithDetails;
  days_pending: number; // Days since invoice date
  is_overdue: boolean; // Past expected_collection_date
  items_pending: SalesInvoiceItemWithProduct[]; // Items not yet fully delivered
  total_value_pending_ugx: number;
}

export interface NotTakenReportSummary {
  total_invoices: number;
  total_items: number;
  total_value_ugx: number;
  oldest_pending_days: number;
  overdue_count: number;
}

export interface NotTakenReport {
  items: NotTakenReportItem[];
  summary: NotTakenReportSummary;
}

// Request to mark items as taken
export interface MarkAsTakenRequest {
  invoice_id: number;
  items: MarkAsTakenItem[];
  delivery_date: string;
  delivered_by?: string;
  received_by?: string;
  vehicle_number?: string;
  notes?: string;
  show_prices?: boolean; // For delivery note printing
  show_totals?: boolean;
}

export interface MarkAsTakenItem {
  invoice_item_id: number;
  product_id: number;
  quantity_to_deliver: number; // How much to mark as taken now
}

// ============================================================================
// FILTERS AND SORTING
// ============================================================================

export interface SalesFilter {
  search?: string; // Search by invoice number or customer name
  customer_id?: number;
  date_range?: DateRange;
  currency?: Currency;
  payment_status?: PaymentStatus;
  delivery_status?: DeliveryStatus;
  is_quotation?: number;
  exported_to_tally?: number;
}

export interface SalesSort {
  field: 'invoice_number' | 'invoice_date' | 'customer_name' | 'total_amount_ugx' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface NotTakenFilter {
  search?: string;
  customer_id?: number;
  date_range?: DateRange;
  sort_by?: 'date' | 'amount' | 'days_pending';
  overdue_only?: boolean;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface SalesStats {
  today_sales_ugx: number;
  today_sales_count: number;
  month_sales_ugx: number;
  month_sales_count: number;

  // Not Taken stats ⭐
  not_taken_value_ugx: number;
  not_taken_count: number;
  oldest_not_taken_days: number;

  // Payment stats
  paid_amount_ugx: number;
  unpaid_amount_ugx: number;
  partial_count: number;

  // Top products
  top_selling_products: TopSellingProduct[];

  // Top customers
  top_customers: TopCustomer[];
}

export interface TopSellingProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  total_revenue_ugx: number;
}

export interface TopCustomer {
  customer_id: number;
  customer_name: string;
  total_purchases_ugx: number;
  invoice_count: number;
}

// ============================================================================
// QUOTATION SPECIFIC
// ============================================================================

export interface QuotationWithDetails extends SalesInvoiceWithDetails {
  valid_until: string | null;
  is_converted: boolean;
  converted_invoice_id: number | null;
  is_expired: boolean;
}

export interface QuotationStats {
  total_quotations: number;
  converted_count: number;
  pending_count: number;
  expired_count: number;
  conversion_rate: number; // Percentage
  total_value_ugx: number;
}
