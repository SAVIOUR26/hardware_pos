import { query, queryOne } from '../database';
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from 'date-fns';

/**
 * Reports Service
 * Generate various business reports: Sales, Purchases, Profit & Loss, Cash Book
 */

interface DateRange {
  start_date: string;
  end_date: string;
}

/**
 * Generate Sales Report
 */
export function getSalesReport(filters: any): any {
  try {
    const { date_range, customer_id, product_id, category, currency, payment_status, delivery_status, group_by } = filters;

    const params: any[] = [date_range.start_date, date_range.end_date];
    let whereConditions = ['si.invoice_date BETWEEN ? AND ?', 'si.is_quotation = 0'];

    if (customer_id) {
      whereConditions.push('si.customer_id = ?');
      params.push(customer_id);
    }

    if (currency) {
      whereConditions.push('si.currency = ?');
      params.push(currency);
    }

    if (payment_status) {
      whereConditions.push('si.payment_status = ?');
      params.push(payment_status);
    }

    if (delivery_status) {
      whereConditions.push('si.delivery_status = ?');
      params.push(delivery_status);
    }

    const whereClause = whereConditions.join(' AND ');

    let rows: any[] = [];

    if (group_by === 'product') {
      // Group by product
      const productFilter = product_id ? 'AND sii.product_id = ?' : '';
      if (product_id) params.push(product_id);

      rows = query(
        `SELECT
          p.id as product_id,
          p.name as product_name,
          p.category,
          SUM(sii.quantity) as quantity_sold,
          SUM(sii.line_total) as total_sales_ugx,
          COUNT(DISTINCT si.id) as invoice_count,
          AVG(sii.line_total) as average_sale_ugx,
          SUM(CASE WHEN si.payment_status = 'Paid' THEN sii.line_total ELSE 0 END) as paid_amount_ugx,
          SUM(CASE WHEN si.payment_status = 'Unpaid' THEN sii.line_total ELSE 0 END) as unpaid_amount_ugx,
          SUM(CASE WHEN si.payment_status = 'Partial' THEN sii.line_total ELSE 0 END) as partial_amount_ugx
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        JOIN products p ON sii.product_id = p.id
        WHERE ${whereClause} ${productFilter}
        GROUP BY p.id
        ORDER BY total_sales_ugx DESC`,
        params
      );
    } else if (group_by === 'customer') {
      rows = query(
        `SELECT
          c.id as customer_id,
          c.name as customer_name,
          SUM(si.total_amount_ugx) as total_sales_ugx,
          COUNT(si.id) as invoice_count,
          AVG(si.total_amount_ugx) as average_sale_ugx,
          SUM(si.amount_paid) as paid_amount_ugx,
          SUM(si.total_amount_ugx - si.amount_paid) as unpaid_amount_ugx
        FROM sales_invoices si
        JOIN customers c ON si.customer_id = c.id
        WHERE ${whereClause}
        GROUP BY c.id
        ORDER BY total_sales_ugx DESC`,
        params
      );
    } else if (group_by === 'day') {
      rows = query(
        `SELECT
          si.invoice_date as date,
          SUM(si.total_amount_ugx) as total_sales_ugx,
          COUNT(si.id) as invoice_count,
          AVG(si.total_amount_ugx) as average_sale_ugx,
          SUM(si.amount_paid) as paid_amount_ugx,
          SUM(si.total_amount_ugx - si.amount_paid) as unpaid_amount_ugx
        FROM sales_invoices si
        WHERE ${whereClause}
        GROUP BY si.invoice_date
        ORDER BY si.invoice_date DESC`,
        params
      );
    } else {
      // No grouping - list all invoices
      rows = query(
        `SELECT
          si.id,
          si.invoice_number,
          si.invoice_date as date,
          c.name as customer_name,
          si.total_amount_ugx as total_sales_ugx,
          si.currency,
          si.payment_status,
          si.delivery_status,
          si.amount_paid as paid_amount_ugx,
          (si.total_amount_ugx - si.amount_paid) as unpaid_amount_ugx
        FROM sales_invoices si
        JOIN customers c ON si.customer_id = c.id
        WHERE ${whereClause}
        ORDER BY si.invoice_date DESC`,
        params
      );
    }

    // Calculate summary
    const summary = queryOne<any>(
      `SELECT
        SUM(si.total_amount_ugx) as total_sales_ugx,
        SUM(CASE WHEN si.currency = 'USD' THEN si.total_amount ELSE 0 END) as total_sales_usd,
        COUNT(si.id) as total_invoices,
        AVG(si.total_amount_ugx) as average_invoice_ugx,
        SUM(si.amount_paid) as total_paid_ugx,
        CASE
          WHEN SUM(si.total_amount_ugx) > 0
          THEN ROUND((SUM(si.amount_paid) * 100.0 / SUM(si.total_amount_ugx)), 2)
          ELSE 0
        END as paid_percentage
      FROM sales_invoices si
      WHERE ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        filters,
        rows,
        summary: {
          total_sales_ugx: summary?.total_sales_ugx || 0,
          total_sales_usd: summary?.total_sales_usd || 0,
          total_invoices: summary?.total_invoices || 0,
          average_invoice_ugx: summary?.average_invoice_ugx || 0,
          paid_percentage: summary?.paid_percentage || 0,
        },
      },
    };
  } catch (error: any) {
    console.error('Failed to generate sales report:', error);
    return {
      success: false,
      error: { code: 'SALES_REPORT_ERROR', message: error.message },
    };
  }
}

/**
 * Generate Purchase Report
 */
export function getPurchaseReport(filters: any): any {
  try {
    const { date_range, supplier_id, product_id, category, currency, payment_status, group_by } = filters;

    const params: any[] = [date_range.start_date, date_range.end_date];
    let whereConditions = ['pi.invoice_date BETWEEN ? AND ?'];

    if (supplier_id) {
      whereConditions.push('pi.supplier_id = ?');
      params.push(supplier_id);
    }

    if (currency) {
      whereConditions.push('pi.currency = ?');
      params.push(currency);
    }

    if (payment_status) {
      whereConditions.push('pi.payment_status = ?');
      params.push(payment_status);
    }

    const whereClause = whereConditions.join(' AND ');

    let rows: any[] = [];

    if (group_by === 'product') {
      const productFilter = product_id ? 'AND pii.product_id = ?' : '';
      if (product_id) params.push(product_id);

      rows = query(
        `SELECT
          p.id as product_id,
          p.name as product_name,
          p.category,
          SUM(pii.quantity) as quantity_purchased,
          SUM(pii.line_total) as total_purchases_ugx,
          COUNT(DISTINCT pi.id) as invoice_count,
          AVG(pii.line_total) as average_purchase_ugx,
          SUM(CASE WHEN pi.payment_status = 'Paid' THEN pii.line_total ELSE 0 END) as paid_amount_ugx,
          SUM(CASE WHEN pi.payment_status = 'Unpaid' THEN pii.line_total ELSE 0 END) as unpaid_amount_ugx
        FROM purchase_invoice_items pii
        JOIN purchase_invoices pi ON pii.invoice_id = pi.id
        JOIN products p ON pii.product_id = p.id
        WHERE ${whereClause} ${productFilter}
        GROUP BY p.id
        ORDER BY total_purchases_ugx DESC`,
        params
      );
    } else if (group_by === 'supplier') {
      rows = query(
        `SELECT
          s.id as supplier_id,
          s.name as supplier_name,
          SUM(pi.total_amount_ugx) as total_purchases_ugx,
          COUNT(pi.id) as invoice_count,
          AVG(pi.total_amount_ugx) as average_purchase_ugx,
          SUM(pi.amount_paid) as paid_amount_ugx,
          SUM(pi.total_amount_ugx - pi.amount_paid) as unpaid_amount_ugx
        FROM purchase_invoices pi
        JOIN suppliers s ON pi.supplier_id = s.id
        WHERE ${whereClause}
        GROUP BY s.id
        ORDER BY total_purchases_ugx DESC`,
        params
      );
    } else if (group_by === 'day') {
      rows = query(
        `SELECT
          pi.invoice_date as date,
          SUM(pi.total_amount_ugx) as total_purchases_ugx,
          COUNT(pi.id) as invoice_count,
          AVG(pi.total_amount_ugx) as average_purchase_ugx,
          SUM(pi.amount_paid) as paid_amount_ugx,
          SUM(pi.total_amount_ugx - pi.amount_paid) as unpaid_amount_ugx
        FROM purchase_invoices pi
        WHERE ${whereClause}
        GROUP BY pi.invoice_date
        ORDER BY pi.invoice_date DESC`,
        params
      );
    } else {
      // No grouping - list all invoices
      rows = query(
        `SELECT
          pi.id,
          pi.invoice_number,
          pi.invoice_date as date,
          s.name as supplier_name,
          pi.total_amount_ugx as total_purchases_ugx,
          pi.currency,
          pi.payment_status,
          pi.amount_paid as paid_amount_ugx,
          (pi.total_amount_ugx - pi.amount_paid) as unpaid_amount_ugx
        FROM purchase_invoices pi
        JOIN suppliers s ON pi.supplier_id = s.id
        WHERE ${whereClause}
        ORDER BY pi.invoice_date DESC`,
        params
      );
    }

    // Calculate summary
    const summary = queryOne<any>(
      `SELECT
        SUM(pi.total_amount_ugx) as total_purchases_ugx,
        SUM(CASE WHEN pi.currency = 'USD' THEN pi.total_amount ELSE 0 END) as total_purchases_usd,
        COUNT(pi.id) as total_invoices,
        AVG(pi.total_amount_ugx) as average_invoice_ugx,
        SUM(pi.amount_paid) as total_paid_ugx,
        CASE
          WHEN SUM(pi.total_amount_ugx) > 0
          THEN ROUND((SUM(pi.amount_paid) * 100.0 / SUM(pi.total_amount_ugx)), 2)
          ELSE 0
        END as paid_percentage
      FROM purchase_invoices pi
      WHERE ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        filters,
        rows,
        summary: {
          total_purchases_ugx: summary?.total_purchases_ugx || 0,
          total_purchases_usd: summary?.total_purchases_usd || 0,
          total_invoices: summary?.total_invoices || 0,
          average_invoice_ugx: summary?.average_invoice_ugx || 0,
          paid_percentage: summary?.paid_percentage || 0,
        },
      },
    };
  } catch (error: any) {
    console.error('Failed to generate purchase report:', error);
    return {
      success: false,
      error: { code: 'PURCHASE_REPORT_ERROR', message: error.message },
    };
  }
}

/**
 * Generate Cash Book Report
 */
export function getCashBook(currency: string, date_range: DateRange): any {
  try {
    // Get all cash transactions (payments)
    const transactions = query(
      `SELECT
        p.id,
        p.payment_date as date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.notes,
        CASE
          WHEN p.transaction_type = 'Sale' THEN 'Income'
          WHEN p.transaction_type = 'Purchase' THEN 'Expense'
          WHEN p.transaction_type = 'Receipt' THEN 'Income'
          WHEN p.transaction_type = 'Payment' THEN 'Expense'
          ELSE p.transaction_type
        END as type,
        CASE
          WHEN p.transaction_type IN ('Sale', 'Receipt') THEN p.amount
          ELSE 0
        END as cash_in,
        CASE
          WHEN p.transaction_type IN ('Purchase', 'Payment') THEN p.amount
          ELSE 0
        END as cash_out,
        c.name as customer_name,
        s.name as supplier_name
      FROM payments p
      LEFT JOIN sales_invoices si ON p.invoice_type = 'Sale' AND p.invoice_id = si.id
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN purchase_invoices pi ON p.invoice_type = 'Purchase' AND p.invoice_id = pi.id
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      WHERE p.payment_date BETWEEN ? AND ?
        AND p.currency = ?
      ORDER BY p.payment_date ASC, p.id ASC`,
      [date_range.start_date, date_range.end_date, currency]
    );

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = transactions.map((txn: any) => {
      runningBalance += txn.cash_in - txn.cash_out;
      return {
        ...txn,
        balance: runningBalance,
      };
    });

    // Calculate summary
    const summary = queryOne<any>(
      `SELECT
        SUM(CASE WHEN transaction_type IN ('Sale', 'Receipt') THEN amount ELSE 0 END) as total_cash_in,
        SUM(CASE WHEN transaction_type IN ('Purchase', 'Payment') THEN amount ELSE 0 END) as total_cash_out
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
        AND currency = ?`,
      [date_range.start_date, date_range.end_date, currency]
    );

    return {
      success: true,
      data: {
        currency,
        date_range,
        transactions: transactionsWithBalance,
        summary: {
          total_cash_in: summary?.total_cash_in || 0,
          total_cash_out: summary?.total_cash_out || 0,
          net_cash_flow: (summary?.total_cash_in || 0) - (summary?.total_cash_out || 0),
          closing_balance: runningBalance,
        },
      },
    };
  } catch (error: any) {
    console.error('Failed to generate cash book:', error);
    return {
      success: false,
      error: { code: 'CASH_BOOK_ERROR', message: error.message },
    };
  }
}

/**
 * Generate Profit & Loss Report
 */
export function getProfitLoss(date_range: DateRange): any {
  try {
    // Get sales revenue
    const revenue = queryOne<any>(
      `SELECT
        SUM(total_amount_ugx) as sales_ugx,
        SUM(discount_amount) as discounts_ugx
      FROM sales_invoices
      WHERE invoice_date BETWEEN ? AND ?
        AND is_quotation = 0`,
      [date_range.start_date, date_range.end_date]
    );

    // Get purchase costs
    const purchases = queryOne<any>(
      `SELECT
        SUM(total_amount_ugx) as purchases_ugx
      FROM purchase_invoices
      WHERE invoice_date BETWEEN ? AND ?`,
      [date_range.start_date, date_range.end_date]
    );

    // Get current stock value
    const stockValue = queryOne<any>(
      `SELECT
        SUM(current_stock * cost_price) as stock_value_ugx
      FROM products
      WHERE is_active = 1`
    );

    const salesUgx = revenue?.sales_ugx || 0;
    const discountsUgx = revenue?.discounts_ugx || 0;
    const netSalesUgx = salesUgx - discountsUgx;
    const purchasesUgx = purchases?.purchases_ugx || 0;

    // Simplified COGS calculation
    const cogsUgx = purchasesUgx;
    const grossProfitUgx = netSalesUgx - cogsUgx;
    const grossProfitMargin = netSalesUgx > 0 ? (grossProfitUgx / netSalesUgx) * 100 : 0;

    return {
      success: true,
      data: {
        date_range,
        revenue: {
          sales_ugx: salesUgx,
          less_returns_ugx: 0,
          less_discounts_ugx: discountsUgx,
          net_sales_ugx: netSalesUgx,
        },
        cogs: {
          opening_stock_value_ugx: 0,
          plus_purchases_ugx: purchasesUgx,
          less_closing_stock_value_ugx: stockValue?.stock_value_ugx || 0,
          total_cogs_ugx: cogsUgx,
        },
        gross_profit_ugx: grossProfitUgx,
        gross_profit_margin: grossProfitMargin,
        net_profit_ugx: grossProfitUgx,
        net_profit_margin: grossProfitMargin,
      },
    };
  } catch (error: any) {
    console.error('Failed to generate profit & loss report:', error);
    return {
      success: false,
      error: { code: 'PROFIT_LOSS_ERROR', message: error.message },
    };
  }
}
