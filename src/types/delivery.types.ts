import { AuditFields } from './common.types';
import { SalesInvoice, SalesInvoiceItem } from './sales.types';

/**
 * Delivery Note type definitions
 * ⭐ Part of "Not Taken" workflow
 */

// ============================================================================
// DELIVERY NOTE
// ============================================================================

export interface DeliveryNote extends AuditFields {
  id: number;
  delivery_note_number: string; // Format: DN-YYYYMMDD-0001
  sales_invoice_id: number;

  // Delivery details
  delivery_date: string;
  delivered_by: string | null;
  received_by: string | null;
  vehicle_number: string | null;
  notes: string | null;

  // Print options ⭐ KEY FEATURE
  show_prices: number; // 1 = show, 0 = hide
  show_totals: number; // 1 = show, 0 = hide
}

// Delivery note with related data
export interface DeliveryNoteWithDetails extends DeliveryNote {
  invoice: SalesInvoice;
  items: DeliveryNoteItem[];
  total_items: number;
  total_quantity_delivered: number;
  total_value: number; // Only if show_prices = 1
}

// ============================================================================
// DELIVERY NOTE ITEMS
// ============================================================================

export interface DeliveryNoteItem {
  id: number;
  delivery_note_id: number;
  sales_invoice_item_id: number;
  product_id: number;

  // Item details
  product_name: string;
  quantity_delivered: number; // Quantity being delivered now
  unit_price: number;
  line_total: number;

  created_at: string;
}

// Delivery note item with product details
export interface DeliveryNoteItemWithDetails extends DeliveryNoteItem {
  invoice_item: SalesInvoiceItem;
}

// ============================================================================
// DELIVERY FORMS
// ============================================================================

export interface DeliveryNoteFormData {
  sales_invoice_id: number;
  delivery_date: string;
  delivered_by?: string;
  received_by?: string;
  vehicle_number?: string;
  notes?: string;

  // Items being delivered
  items: DeliveryNoteItemFormData[];

  // Print options
  show_prices?: boolean;
  show_totals?: boolean;
}

export interface DeliveryNoteItemFormData {
  sales_invoice_item_id: number;
  product_id: number;
  quantity_to_deliver: number;
}

// ============================================================================
// DELIVERY NOTE FILTERS
// ============================================================================

export interface DeliveryNoteFilter {
  search?: string; // Search by delivery note number or customer
  sales_invoice_id?: number;
  date_range?: {
    startDate: string;
    endDate: string;
  };
}

export interface DeliveryNoteSort {
  field: 'delivery_note_number' | 'delivery_date' | 'customer_name' | 'created_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// DELIVERY SUMMARY
// ============================================================================

export interface DeliverySummary {
  total_deliveries: number;
  total_items_delivered: number;
  total_value_delivered_ugx: number;
  deliveries_today: number;
  pending_deliveries: number; // Invoices with "Not Taken" status
}
