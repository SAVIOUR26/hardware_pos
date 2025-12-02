import { Currency, DateRange } from './common.types';

/**
 * Report type definitions
 */

// ============================================================================
// SALES REPORT
// ============================================================================

export interface SalesReportFilters {
  date_range: DateRange;
  customer_id?: number;
  product_id?: number;
  category?: string;
  currency?: Currency;
  payment_status?: string;
  delivery_status?: string;
  group_by?: 'day' | 'week' | 'month' | 'product' | 'customer' | 'category';
}

export interface SalesReportRow {
  date?: string; // If grouped by time
  product_id?: number;
  product_name?: string;
  customer_id?: number;
  customer_name?: string;
  category?: string;

  // Metrics
  quantity_sold: number;
  total_sales_ugx: number;
  total_sales_usd: number;
  invoice_count: number;
  average_sale_ugx: number;

  // Payment breakdown
  paid_amount_ugx: number;
  unpaid_amount_ugx: number;
  partial_amount_ugx: number;
}

export interface SalesReport {
  filters: SalesReportFilters;
  rows: SalesReportRow[];
  summary: {
    total_sales_ugx: number;
    total_sales_usd: number;
    total_invoices: number;
    total_quantity: number;
    paid_percentage: number;
    average_invoice_ugx: number;
  };
}

// ============================================================================
// PURCHASE REPORT
// ============================================================================

export interface PurchaseReportFilters {
  date_range: DateRange;
  supplier_id?: number;
  product_id?: number;
  category?: string;
  currency?: Currency;
  payment_status?: string;
  group_by?: 'day' | 'week' | 'month' | 'product' | 'supplier' | 'category';
}

export interface PurchaseReportRow {
  date?: string;
  product_id?: number;
  product_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  category?: string;

  // Metrics
  quantity_purchased: number;
  total_purchases_ugx: number;
  total_purchases_usd: number;
  invoice_count: number;
  average_purchase_ugx: number;

  // Payment breakdown
  paid_amount_ugx: number;
  unpaid_amount_ugx: number;
}

export interface PurchaseReport {
  filters: PurchaseReportFilters;
  rows: PurchaseReportRow[];
  summary: {
    total_purchases_ugx: number;
    total_purchases_usd: number;
    total_invoices: number;
    total_quantity: number;
    paid_percentage: number;
    average_invoice_ugx: number;
  };
}

// ============================================================================
// PROFIT & LOSS REPORT
// ============================================================================

export interface ProfitLossFilters {
  date_range: DateRange;
}

export interface ProfitLossReport {
  filters: ProfitLossFilters;

  // Revenue
  revenue: {
    sales_ugx: number;
    less_returns_ugx: number;
    less_discounts_ugx: number;
    net_sales_ugx: number;
  };

  // Cost of Goods Sold
  cogs: {
    opening_stock_value_ugx: number;
    plus_purchases_ugx: number;
    less_closing_stock_value_ugx: number;
    total_cogs_ugx: number;
  };

  // Gross Profit
  gross_profit_ugx: number;
  gross_profit_margin: number; // Percentage

  // Operating Expenses (if tracked)
  expenses?: {
    salaries?: number;
    rent?: number;
    utilities?: number;
    other?: number;
    total_expenses_ugx: number;
  };

  // Net Profit
  net_profit_ugx: number;
  net_profit_margin: number; // Percentage
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

export interface DashboardSummary {
  // Sales
  today_sales_ugx: number;
  yesterday_sales_ugx: number;
  month_sales_ugx: number;
  last_month_sales_ugx: number;
  sales_growth_percentage: number;

  // Pending collections (Not Taken) ⭐
  not_taken_value_ugx: number;
  not_taken_count: number;
  oldest_not_taken_days: number;

  // Stock
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value_ugx: number;

  // Receivables and Payables
  total_receivables_ugx: number;
  total_payables_ugx: number;

  // Recent activity
  recent_sales_count: number;
  recent_purchases_count: number;
  recent_payments_count: number;
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export interface ReportExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  filename?: string;
  include_summary?: boolean;
  include_charts?: boolean;
  page_orientation?: 'portrait' | 'landscape';
}

export interface ExportResult {
  success: boolean;
  file_path: string;
  message?: string;
}
