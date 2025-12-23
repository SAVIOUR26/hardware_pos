import Database from 'better-sqlite3';
import { getDatabase, transaction, queryOne, query, execute } from '../database';
import { format } from 'date-fns';

/**
 * Sales Service
 * ⭐ Implements the critical "Not Taken" workflow
 *
 * Key Features:
 * - Create sales invoices with "Not Taken" status by default
 * - Reserve stock (don't reduce actual stock until delivery)
 * - Track delivery status at invoice and item levels
 * - Generate "Not Taken" report
 * - Handle quotations and conversion to invoices
 */

interface SalesInvoiceData {
  customer_id: number;
  invoice_date: string;
  currency: string;
  exchange_rate: number;
  expected_collection_date?: string;
  collection_notes?: string;
  items: SalesInvoiceItemData[];
  payment_status: string;
  amount_paid?: number;
  payment_method?: string;
  is_quotation?: number;
}

interface SalesInvoiceItemData {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
}

/**
 * Generate next invoice number
 * Format: INV-YYYYMMDD-0001
 */
export function generateInvoiceNumber(isQuotation: boolean = false): string {
  const db = getDatabase();
  const prefix = isQuotation ? 'QT' : 'INV';
  const today = format(new Date(), 'yyyyMMdd');

  // Get count of invoices created today
  const result = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM sales_invoices
     WHERE invoice_number LIKE ? AND is_quotation = ?`,
    [`${prefix}-${today}-%`, isQuotation ? 1 : 0],
  );

  const count = (result?.count || 0) + 1;
  const sequence = count.toString().padStart(4, '0');

  return `${prefix}-${today}-${sequence}`;
}

/**
 * Create a sales invoice
 * ⭐ Implements "Not Taken" workflow
 */
export function createSalesInvoice(data: SalesInvoiceData): any {
  return transaction((db: Database.Database) => {
    try {
      // 1. Validate customer exists
      const customer = queryOne('SELECT id, name FROM customers WHERE id = ?', [data.customer_id]);
      if (!customer) {
        throw new Error(`Customer with ID ${data.customer_id} not found`);
      }

      // 2. Validate products exist and have sufficient stock
      for (const item of data.items) {
        const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        // Check available stock (current - reserved)
        const availableStock = product.current_stock - product.reserved_stock;
        if (availableStock < item.quantity && !data.is_quotation) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
          );
        }
      }

      // 3. Calculate totals
      let subtotal = 0;
      let discountAmount = 0;
      let taxAmount = 0;

      for (const item of data.items) {
        const lineSubtotal = item.quantity * item.unit_price;
        const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100);
        const lineAfterDiscount = lineSubtotal - lineDiscount;
        const lineTax = lineAfterDiscount * ((item.tax_percent || 0) / 100);

        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;
      }

      const totalAmount = subtotal - discountAmount + taxAmount;
      const totalAmountUgx = data.currency === 'USD' ? totalAmount * data.exchange_rate : totalAmount;

      // 4. Generate invoice number
      const invoiceNumber = generateInvoiceNumber(Boolean(data.is_quotation));

      // 5. Insert sales invoice
      const invoiceResult = execute(
        `INSERT INTO sales_invoices (
          invoice_number, customer_id, invoice_date, is_quotation,
          currency, exchange_rate,
          subtotal, discount_amount, tax_amount, total_amount, total_amount_ugx,
          payment_status, amount_paid, payment_method,
          delivery_status, expected_collection_date, collection_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber,
          data.customer_id,
          data.invoice_date,
          data.is_quotation || 0,
          data.currency,
          data.exchange_rate,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          totalAmountUgx,
          data.payment_status,
          data.amount_paid || 0,
          data.payment_method || null,
          data.is_quotation ? 'Taken' : 'Not Taken', // ⭐ Default to "Not Taken" for invoices
          data.expected_collection_date || null,
          data.collection_notes || null,
        ],
      );

      const invoiceId = invoiceResult.lastInsertRowid as number;

      // 6. Insert sales invoice items and reserve stock
      for (const item of data.items) {
        // Get product details for snapshot
        const product = queryOne<any>('SELECT name FROM products WHERE id = ?', [item.product_id]);

        const lineSubtotal = item.quantity * item.unit_price;
        const lineDiscount = lineSubtotal * ((item.discount_percent || 0) / 100);
        const lineAfterDiscount = lineSubtotal - lineDiscount;
        const lineTax = lineAfterDiscount * ((item.tax_percent || 0) / 100);
        const lineTotal = lineAfterDiscount + lineTax;

        // Insert item
        execute(
          `INSERT INTO sales_invoice_items (
            invoice_id, product_id, product_name,
            quantity, unit_price, discount_percent, tax_percent, line_total,
            delivery_status, quantity_delivered
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.product_id,
            product?.name,
            item.quantity,
            item.unit_price,
            item.discount_percent || 0,
            item.tax_percent || 0,
            lineTotal,
            data.is_quotation ? 'Taken' : 'Not Taken', // ⭐ Default to "Not Taken"
            0, // No quantity delivered yet
          ],
        );

        // ⭐ RESERVE STOCK (don't reduce actual stock yet)
        if (!data.is_quotation) {
          execute('UPDATE products SET reserved_stock = reserved_stock + ? WHERE id = ?', [
            item.quantity,
            item.product_id,
          ]);
        }
      }

      // 7. If payment is made, record it
      if (data.payment_status === 'Paid' && data.amount_paid && data.amount_paid > 0) {
        // Record cash transaction
        execute(
          `INSERT INTO cash_transactions (
            transaction_date, transaction_type, currency, amount,
            description, reference, sales_invoice_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.invoice_date,
            'Receipt',
            data.currency,
            data.amount_paid,
            `Payment for ${invoiceNumber} from ${customer.name}`,
            invoiceNumber,
            invoiceId,
          ],
        );

        // Update customer balance
        const balanceField = data.currency === 'USD' ? 'current_balance_usd' : 'current_balance_ugx';
        execute(`UPDATE customers SET ${balanceField} = ${balanceField} + ? WHERE id = ?`, [
          totalAmount - data.amount_paid,
          data.customer_id,
        ]);
      } else {
        // Update customer balance (unpaid invoice)
        const balanceField = data.currency === 'USD' ? 'current_balance_usd' : 'current_balance_ugx';
        execute(`UPDATE customers SET ${balanceField} = ${balanceField} + ? WHERE id = ?`, [
          totalAmount,
          data.customer_id,
        ]);
      }

      // 8. Return created invoice with items
      const invoice = queryOne(
        `SELECT * FROM sales_invoices WHERE id = ?`,
        [invoiceId],
      );

      const items = query(
        `SELECT * FROM sales_invoice_items WHERE invoice_id = ?`,
        [invoiceId],
      );

      return {
        success: true,
        data: {
          ...invoice,
          items,
        },
      };
    } catch (error: any) {
      console.error('Error creating sales invoice:', error);
      throw error;
    }
  });
}

/**
 * Get "Not Taken" report
 * ⭐ KEY FEATURE - Shows all pending collections
 */
export function getNotTakenReport(filters?: any): any {
  try {
    let whereClauses = ["si.delivery_status IN ('Not Taken', 'Partially Taken')"];
    const params: any[] = [];

    // Apply filters
    if (filters?.customer_id) {
      whereClauses.push('si.customer_id = ?');
      params.push(filters.customer_id);
    }

    if (filters?.date_range) {
      whereClauses.push('si.invoice_date >= ? AND si.invoice_date <= ?');
      params.push(filters.date_range.startDate, filters.date_range.endDate);
    }

    if (filters?.overdue_only) {
      whereClauses.push('si.expected_collection_date < date("now")');
    }

    if (filters?.search) {
      whereClauses.push('(si.invoice_number LIKE ? OR c.name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get invoices with "Not Taken" status
    const invoices = query(
      `SELECT
        si.*,
        c.name as customer_name,
        c.phone as customer_phone,
        CAST(julianday('now') - julianday(si.invoice_date) AS INTEGER) as days_pending
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      ${whereClause}
      ORDER BY si.invoice_date ASC`,
      params,
    );

    // For each invoice, get pending items
    const reportItems = invoices.map((invoice: any) => {
      // Get items that are not fully delivered
      const items = query(
        `SELECT
          sii.*,
          p.name as product_name,
          p.current_stock,
          p.reserved_stock,
          (sii.quantity - sii.quantity_delivered) as quantity_remaining
        FROM sales_invoice_items sii
        JOIN products p ON sii.product_id = p.id
        WHERE sii.invoice_id = ? AND sii.quantity_delivered < sii.quantity`,
        [invoice.id],
      );

      // Calculate pending value
      const totalValuePendingUgx = items.reduce((sum: number, item: any) => {
        const remainingQty = item.quantity - item.quantity_delivered;
        const itemValue = (item.line_total / item.quantity) * remainingQty;
        return sum + (invoice.currency === 'USD' ? itemValue * invoice.exchange_rate : itemValue);
      }, 0);

      const isOverdue =
        invoice.expected_collection_date && new Date(invoice.expected_collection_date) < new Date();

      return {
        invoice: {
          ...invoice,
          items,
        },
        days_pending: invoice.days_pending,
        is_overdue: isOverdue,
        items_pending: items,
        total_value_pending_ugx: totalValuePendingUgx,
      };
    });

    // Calculate summary
    const summary = {
      total_invoices: reportItems.length,
      total_items: reportItems.reduce((sum, item) => sum + item.items_pending.length, 0),
      total_value_ugx: reportItems.reduce((sum, item) => sum + item.total_value_pending_ugx, 0),
      oldest_pending_days: reportItems.length > 0 ? Math.max(...reportItems.map((i) => i.days_pending)) : 0,
      overdue_count: reportItems.filter((i) => i.is_overdue).length,
    };

    return {
      success: true,
      data: {
        items: reportItems,
        summary,
      },
    };
  } catch (error: any) {
    console.error('Error getting Not Taken report:', error);
    return {
      success: false,
      error: {
        code: 'NOT_TAKEN_REPORT_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Get sales statistics for dashboard
 */
export function getSalesStats(): any {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

    // Today's sales
    const todaySales = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx), 0) as total,
        COUNT(*) as count
      FROM sales_invoices
      WHERE invoice_date = ? AND is_quotation = 0`,
      [today],
    );

    // This month's sales
    const monthSales = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx), 0) as total,
        COUNT(*) as count
      FROM sales_invoices
      WHERE invoice_date >= ? AND is_quotation = 0`,
      [monthStart],
    );

    // Not Taken stats ⭐
    const notTakenStats = queryOne<any>(
      `SELECT
        COALESCE(SUM(total_amount_ugx), 0) as total_value,
        COUNT(*) as count,
        MAX(CAST(julianday('now') - julianday(invoice_date) AS INTEGER)) as oldest_days
      FROM sales_invoices
      WHERE delivery_status IN ('Not Taken', 'Partially Taken') AND is_quotation = 0`,
    );

    // Payment stats
    const paymentStats = queryOne<any>(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_amount_ugx ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN payment_status = 'Unpaid' THEN total_amount_ugx ELSE 0 END), 0) as unpaid,
        COUNT(CASE WHEN payment_status = 'Partial' THEN 1 END) as partial_count
      FROM sales_invoices
      WHERE is_quotation = 0`,
    );

    // Top selling products (this month)
    const topProducts = query(
      `SELECT
        p.id as product_id,
        p.name as product_name,
        SUM(sii.quantity) as quantity_sold,
        SUM(sii.line_total * CASE WHEN si.currency = 'USD' THEN si.exchange_rate ELSE 1 END) as total_revenue_ugx
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.id
      JOIN products p ON sii.product_id = p.id
      WHERE si.invoice_date >= ? AND si.is_quotation = 0
      GROUP BY p.id, p.name
      ORDER BY total_revenue_ugx DESC
      LIMIT 5`,
      [monthStart],
    );

    // Top customers (this month)
    const topCustomers = query(
      `SELECT
        c.id as customer_id,
        c.name as customer_name,
        SUM(si.total_amount_ugx) as total_purchases_ugx,
        COUNT(si.id) as invoice_count
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.invoice_date >= ? AND si.is_quotation = 0
      GROUP BY c.id, c.name
      ORDER BY total_purchases_ugx DESC
      LIMIT 5`,
      [monthStart],
    );

    return {
      success: true,
      data: {
        today_sales_ugx: todaySales?.total || 0,
        today_sales_count: todaySales?.count || 0,
        month_sales_ugx: monthSales?.total || 0,
        month_sales_count: monthSales?.count || 0,

        // Not Taken stats ⭐
        not_taken_value_ugx: notTakenStats?.total_value || 0,
        not_taken_count: notTakenStats?.count || 0,
        oldest_not_taken_days: notTakenStats?.oldest_days || 0,

        // Payment stats
        paid_amount_ugx: paymentStats?.paid || 0,
        unpaid_amount_ugx: paymentStats?.unpaid || 0,
        partial_count: paymentStats?.partial_count || 0,

        top_selling_products: topProducts,
        top_customers: topCustomers,
      },
    };
  } catch (error: any) {
    console.error('Error getting sales stats:', error);
    return {
      success: false,
      error: {
        code: 'SALES_STATS_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Get sales invoice by ID
 */
export function getSalesInvoice(id: number): any {
  try {
    const invoice = queryOne(
      `SELECT
        si.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.id = ?`,
      [id],
    );

    if (!invoice) {
      return {
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: `Invoice with ID ${id} not found`,
        },
      };
    }

    const items = query(
      `SELECT
        sii.*,
        p.name as product_name,
        p.unit,
        (sii.quantity - sii.quantity_delivered) as quantity_remaining
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.id
      WHERE sii.invoice_id = ?`,
      [id],
    );

    return {
      success: true,
      data: {
        ...invoice,
        items,
      },
    };
  } catch (error: any) {
    console.error('Error getting sales invoice:', error);
    return {
      success: false,
      error: {
        code: 'GET_INVOICE_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * List sales invoices with filters
 */
export function listSalesInvoices(filters?: any): any {
  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    // Apply filters
    if (filters?.search) {
      whereClauses.push('(si.invoice_number LIKE ? OR c.name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.customer_id) {
      whereClauses.push('si.customer_id = ?');
      params.push(filters.customer_id);
    }

    if (filters?.payment_status) {
      whereClauses.push('si.payment_status = ?');
      params.push(filters.payment_status);
    }

    if (filters?.delivery_status) {
      whereClauses.push('si.delivery_status = ?');
      params.push(filters.delivery_status);
    }

    if (filters?.is_quotation !== undefined) {
      whereClauses.push('si.is_quotation = ?');
      params.push(filters.is_quotation);
    }

    if (filters?.date_range) {
      whereClauses.push('si.invoice_date >= ? AND si.invoice_date <= ?');
      params.push(filters.date_range.startDate, filters.date_range.endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const invoices = query(
      `SELECT
        si.*,
        c.name as customer_name,
        COUNT(sii.id) as total_items
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      LEFT JOIN sales_invoice_items sii ON si.id = sii.invoice_id
      ${whereClause}
      GROUP BY si.id
      ORDER BY si.invoice_date DESC, si.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, filters?.limit || 50, filters?.offset || 0],
    );

    const totalCount = queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT si.id) as count
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      ${whereClause}`,
      params,
    );

    return {
      success: true,
      data: {
        invoices,
        total: totalCount?.count || 0,
        page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
        pageSize: filters?.limit || 50,
      },
    };
  } catch (error: any) {
    console.error('Error listing sales invoices:', error);
    return {
      success: false,
      error: {
        code: 'LIST_INVOICES_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Delete sales invoice
 * ⭐ Properly reverses all changes (stock, customer balance, etc.)
 */
export function deleteSalesInvoice(invoiceId: number): any {
  return transaction((db: Database.Database) => {
    try {
      // 1. Get invoice details
      const invoice = queryOne<any>(
        'SELECT * FROM sales_invoices WHERE id = ?',
        [invoiceId]
      );

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // 2. Get invoice items
      const items = query<any>(
        'SELECT * FROM sales_invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );

      // 3. Release reserved stock (if not quotation)
      if (!invoice.is_quotation) {
        for (const item of items) {
          // Release reserved stock
          execute(
            'UPDATE products SET reserved_stock = reserved_stock - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );

          // If items were delivered, add back to current stock
          if (item.quantity_delivered > 0) {
            execute(
              'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
              [item.quantity_delivered, item.product_id]
            );
          }
        }
      }

      // 4. Reverse customer balance
      const balanceField = invoice.currency === 'USD' ? 'current_balance_usd' : 'current_balance_ugx';

      // Calculate the amount to reverse
      const amountToReverse = invoice.total_amount - invoice.amount_paid;

      execute(
        `UPDATE customers SET ${balanceField} = ${balanceField} - ? WHERE id = ?`,
        [amountToReverse, invoice.customer_id]
      );

      // 5. Delete related cash transactions
      execute(
        'DELETE FROM cash_transactions WHERE sales_invoice_id = ?',
        [invoiceId]
      );

      // 6. Delete invoice items
      execute(
        'DELETE FROM sales_invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );

      // 7. Delete the invoice
      execute(
        'DELETE FROM sales_invoices WHERE id = ?',
        [invoiceId]
      );

      return {
        success: true,
        data: {
          message: `Invoice ${invoice.invoice_number} deleted successfully`,
        },
      };
    } catch (error: any) {
      console.error('Error deleting sales invoice:', error);
      throw error;
    }
  });
}

/**
 * Convert quotation to invoice
 */
export function convertQuotationToInvoice(quotationId: number): any {
  return transaction((db: Database.Database) => {
    try {
      // Get quotation
      const quotation = queryOne<any>('SELECT * FROM sales_invoices WHERE id = ? AND is_quotation = 1', [
        quotationId,
      ]);

      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Get quotation items
      const items = query<any>('SELECT * FROM sales_invoice_items WHERE invoice_id = ?', [quotationId]);

      // Create invoice data
      const invoiceData: SalesInvoiceData = {
        customer_id: quotation.customer_id,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        currency: quotation.currency,
        exchange_rate: quotation.exchange_rate,
        expected_collection_date: quotation.expected_collection_date,
        collection_notes: quotation.collection_notes,
        payment_status: 'Unpaid',
        items: items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
        })),
      };

      // Create invoice
      const result = createSalesInvoice(invoiceData);

      // Link quotation to invoice
      if (result.success) {
        execute('UPDATE sales_invoices SET quotation_id = ? WHERE id = ?', [quotationId, result.data.id]);
      }

      return result;
    } catch (error: any) {
      console.error('Error converting quotation:', error);
      throw error;
    }
  });
}
