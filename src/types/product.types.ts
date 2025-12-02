import { AuditFields } from './common.types';

/**
 * Product / Inventory type definitions
 */

// ============================================================================
// PRODUCT
// ============================================================================

export interface Product extends AuditFields {
  id: number;
  tally_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  barcode: string | null;

  // Pricing
  cost_price_ugx: number;
  cost_price_usd: number;
  selling_price_ugx: number;
  selling_price_usd: number;

  // Stock tracking
  current_stock: number; // Total physical stock
  reserved_stock: number; // Stock reserved for "Not Taken" orders ⭐
  reorder_level: number;

  // Status
  is_active: number;
}

// Computed field - not in database
export interface ProductWithAvailable extends Product {
  available_stock: number; // current_stock - reserved_stock
  stock_value_ugx: number; // current_stock * cost_price_ugx
  is_low_stock: boolean; // available_stock <= reorder_level
  is_out_of_stock: boolean; // available_stock <= 0
}

// ============================================================================
// PRODUCT FORMS
// ============================================================================

export interface ProductFormData {
  name: string;
  description?: string;
  category?: string;
  unit: string;
  barcode?: string;

  cost_price_ugx: number;
  cost_price_usd: number;
  selling_price_ugx: number;
  selling_price_usd: number;

  reorder_level: number;
  opening_stock?: number; // Only when creating new product
  is_active?: number;
}

// ============================================================================
// STOCK ADJUSTMENT
// ============================================================================

export interface StockAdjustment extends AuditFields {
  id: number;
  product_id: number;
  quantity: number; // Positive for increase, negative for decrease
  reason: string;
  notes: string | null;
  approved_by: string | null;
}

export interface StockAdjustmentFormData {
  product_id: number;
  quantity: number;
  reason: string;
  notes?: string;
  approved_by?: string;
}

export type StockAdjustmentReason =
  | 'Physical Count Correction'
  | 'Damaged Goods'
  | 'Theft/Loss'
  | 'Return to Supplier'
  | 'Found Extra'
  | 'Other';

// ============================================================================
// FILTERS AND SORTING
// ============================================================================

export interface ProductFilter {
  search?: string; // Search by name or barcode
  category?: string;
  is_active?: number;
  stock_status?: 'all' | 'low' | 'out' | 'good';
  tally_id?: string;
}

export interface ProductSort {
  field: 'name' | 'category' | 'current_stock' | 'available_stock' | 'selling_price_ugx' | 'created_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// STOCK REPORT
// ============================================================================

export interface StockReportItem {
  product: ProductWithAvailable;
  total_sold: number;
  total_purchased: number;
  last_sale_date: string | null;
  last_purchase_date: string | null;
}

export interface StockSummary {
  total_products: number;
  total_stock_value_ugx: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_reserved: number; // Total reserved stock value
}
