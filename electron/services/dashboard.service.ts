import { query, queryOne } from '../database';
import { format, startOfMonth, startOfDay } from 'date-fns';

/**
 * Dashboard Service
 * Aggregates statistics and metrics for the dashboard
 */

export function getDashboardStats(): any {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    // Sales Stats
    const salesStats = queryOne<any>(
      `SELECT
        COALESCE(SUM(CASE WHEN invoice_date = ? THEN total_amount_ugx ELSE 0 END), 0) as today_sales,
        COALESCE(SUM(CASE WHEN invoice_date >= ? THEN total_amount_ugx ELSE 0 END), 0) as month_sales,
        COUNT(CASE WHEN invoice_date = ? THEN 1 END) as today_count,
        COUNT(CASE WHEN invoice_date >= ? THEN 1 END) as month_count
      FROM sales_invoices
      WHERE is_quotation = 0`,
      [today, monthStart, today, monthStart]
    );

    // Not Taken Stats ⭐
    const notTakenStats = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx), 0) as total_value,
        COUNT(*) as count,
        MAX(CAST(julianday('now') - julianday(invoice_date) AS INTEGER)) as oldest_days
      FROM sales_invoices
      WHERE delivery_status IN ('Not Taken', 'Partially Taken') AND is_quotation = 0`
    );

    // Outstanding Receivables
    const receivables = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx - amount_paid), 0) as outstanding
      FROM sales_invoices
      WHERE payment_status IN ('Unpaid', 'Partial') AND is_quotation = 0`
    );

    // Outstanding Payables
    const payables = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx - amount_paid), 0) as outstanding
      FROM purchase_invoices
      WHERE payment_status = 'Unpaid'`
    );

    // Low Stock Items (available stock <= reorder level)
    const lowStock = queryOne<any>(
      `SELECT COUNT(*) as count
      FROM products
      WHERE (current_stock - reserved_stock) <= reorder_level
      AND is_active = 1`
    );

    // Out of Stock Items
    const outOfStock = queryOne<any>(
      `SELECT COUNT(*) as count
      FROM products
      WHERE (current_stock - reserved_stock) <= 0
      AND is_active = 1`
    );

    // Total Inventory Value
    const inventoryValue = queryOne<any>(
      `SELECT
        COALESCE(SUM(current_stock * cost_price_ugx), 0) as total_value
      FROM products
      WHERE is_active = 1`
    );

    // Purchase Stats
    const purchaseStats = queryOne<any>(
      `SELECT
        COALESCE(SUM(CASE WHEN purchase_date = ? THEN total_amount_ugx ELSE 0 END), 0) as today_purchases,
        COALESCE(SUM(CASE WHEN purchase_date >= ? THEN total_amount_ugx ELSE 0 END), 0) as month_purchases,
        COUNT(CASE WHEN purchase_date >= ? THEN 1 END) as month_count
      FROM purchase_invoices`,
      [today, monthStart, monthStart]
    );

    // Recent Sales (last 10)
    const recentSales = query(
      `SELECT
        si.id,
        si.invoice_number,
        si.invoice_date,
        si.total_amount_ugx,
        si.currency,
        si.total_amount,
        si.payment_status,
        si.delivery_status,
        c.name as customer_name
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.is_quotation = 0
      ORDER BY si.created_at DESC
      LIMIT 10`
    );

    // Recent Purchases (last 10)
    const recentPurchases = query(
      `SELECT
        pi.id,
        pi.purchase_number,
        pi.purchase_date,
        pi.total_amount_ugx,
        pi.currency,
        pi.total_amount,
        pi.payment_status,
        s.name as supplier_name
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      ORDER BY pi.created_at DESC
      LIMIT 10`
    );

    // Top Selling Products (this month)
    const topProducts = query(
      `SELECT
        p.id,
        p.name,
        p.category,
        SUM(sii.quantity) as quantity_sold,
        SUM(sii.line_total) as revenue_ugx
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.id
      JOIN products p ON sii.product_id = p.id
      WHERE si.invoice_date >= ? AND si.is_quotation = 0
      GROUP BY p.id
      ORDER BY revenue_ugx DESC
      LIMIT 5`,
      [monthStart]
    );

    // Top Customers (this month)
    const topCustomers = query(
      `SELECT
        c.id,
        c.name,
        c.phone,
        SUM(si.total_amount_ugx) as total_spent,
        COUNT(si.id) as invoice_count
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.invoice_date >= ? AND si.is_quotation = 0
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5`,
      [monthStart]
    );

    return {
      success: true,
      data: {
        sales: {
          today: salesStats.today_sales || 0,
          today_count: salesStats.today_count || 0,
          month: salesStats.month_sales || 0,
          month_count: salesStats.month_count || 0,
        },
        purchases: {
          today: purchaseStats.today_purchases || 0,
          month: purchaseStats.month_purchases || 0,
          month_count: purchaseStats.month_count || 0,
        },
        notTaken: {
          value: notTakenStats.total_value || 0,
          count: notTakenStats.count || 0,
          oldest_days: notTakenStats.oldest_days || 0,
        },
        financials: {
          receivables: receivables.outstanding || 0,
          payables: payables.outstanding || 0,
        },
        inventory: {
          low_stock_count: lowStock.count || 0,
          out_of_stock_count: outOfStock.count || 0,
          total_value: inventoryValue.total_value || 0,
        },
        recent: {
          sales: recentSales || [],
          purchases: recentPurchases || [],
        },
        top: {
          products: topProducts || [],
          customers: topCustomers || [],
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    return {
      success: false,
      error: { code: 'DASHBOARD_STATS_ERROR', message: error.message },
    };
  }
}
