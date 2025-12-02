/**
 * Sales Return Service
 * Handles product returns with automatic stock adjustment
 */

import { getDatabase } from '../database';
import { format } from 'date-fns';

export interface CreateSalesReturnParams {
  sales_invoice_id: number;
  customer_id: number;
  return_date: string;
  reason: string;
  notes?: string;
  currency: string;
  exchange_rate: number;
  items: {
    sales_invoice_item_id: number;
    product_id: number;
    quantity_returned: number;
    unit_price: number;
    discount_percent?: number;
    tax_percent?: number;
    condition: 'Good' | 'Damaged' | 'Defective';
    restock: number; // 1 or 0
  }[];
  refund_method?: string;
  refund_status?: string;
}

/**
 * Generate return number: RET-YYYYMMDD-0001
 */
function generateReturnNumber(db: any): string {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `RET-${today}`;

  const lastReturn = db
    .prepare(
      `SELECT return_number FROM sales_returns
       WHERE return_number LIKE ?
       ORDER BY return_number DESC LIMIT 1`
    )
    .get(`${prefix}%`);

  if (!lastReturn) {
    return `${prefix}-0001`;
  }

  const lastNumber = parseInt(lastReturn.return_number.split('-').pop() || '0', 10);
  const nextNumber = lastNumber + 1;
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Create a sales return
 */
export function createSalesReturn(params: CreateSalesReturnParams) {
  const db = getDatabase();

  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Validate invoice exists
    const invoice = db
      .prepare('SELECT * FROM sales_invoices WHERE id = ?')
      .get(params.sales_invoice_id);

    if (!invoice) {
      throw new Error('Sales invoice not found');
    }

    // Generate return number
    const return_number = generateReturnNumber(db);

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    for (const item of params.items) {
      const base_amount = item.quantity_returned * item.unit_price;
      const discount = base_amount * ((item.discount_percent || 0) / 100);
      const taxable = base_amount - discount;
      const tax = taxable * ((item.tax_percent || 0) / 100);

      subtotal += taxable;
      tax_amount += tax;
    }

    const total_amount = subtotal + tax_amount;
    const total_amount_ugx =
      params.currency === 'USD' ? total_amount * params.exchange_rate : total_amount;

    // Insert sales return header
    const insertReturn = db.prepare(`
      INSERT INTO sales_returns (
        return_number, sales_invoice_id, customer_id, return_date,
        reason, notes, currency, exchange_rate,
        subtotal, tax_amount, total_amount, total_amount_ugx,
        refund_status, refund_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const returnResult = insertReturn.run(
      return_number,
      params.sales_invoice_id,
      params.customer_id,
      params.return_date,
      params.reason,
      params.notes || null,
      params.currency,
      params.exchange_rate,
      subtotal,
      tax_amount,
      total_amount,
      total_amount_ugx,
      params.refund_status || 'Pending',
      params.refund_method || null
    );

    const return_id = returnResult.lastInsertRowid;

    // Insert return items and update stock
    const insertReturnItem = db.prepare(`
      INSERT INTO sales_return_items (
        return_id, sales_invoice_item_id, product_id, product_name,
        quantity_returned, unit_price, discount_percent, tax_percent,
        line_total, condition, restock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products
      SET current_stock = current_stock + ?,
          reserved_stock = CASE
            WHEN reserved_stock >= ? THEN reserved_stock - ?
            ELSE 0
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const createStockAdjustment = db.prepare(`
      INSERT INTO stock_adjustments (product_id, quantity, reason, notes)
      VALUES (?, ?, 'Sales Return', ?)
    `);

    for (const item of params.items) {
      // Get product name
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);

      // Calculate line total
      const base_amount = item.quantity_returned * item.unit_price;
      const discount = base_amount * ((item.discount_percent || 0) / 100);
      const taxable = base_amount - discount;
      const tax = taxable * ((item.tax_percent || 0) / 100);
      const line_total = taxable + tax;

      // Insert return item
      insertReturnItem.run(
        return_id,
        item.sales_invoice_item_id,
        item.product_id,
        product.name,
        item.quantity_returned,
        item.unit_price,
        item.discount_percent || 0,
        item.tax_percent || 0,
        line_total,
        item.condition,
        item.restock
      );

      // Update stock if restock is enabled (only for Good condition items)
      if (item.restock === 1) {
        updateStock.run(
          item.quantity_returned,
          item.quantity_returned,
          item.quantity_returned,
          item.product_id
        );

        // Create stock adjustment record
        createStockAdjustment.run(
          item.product_id,
          item.quantity_returned,
          `Return #${return_number} - ${item.condition} condition`
        );
      } else {
        // Damaged/Defective items: still reduce reserved stock but don't add to current_stock
        const reduceReserved = db.prepare(`
          UPDATE products
          SET reserved_stock = CASE
            WHEN reserved_stock >= ? THEN reserved_stock - ?
            ELSE 0
          END,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        reduceReserved.run(item.quantity_returned, item.quantity_returned, item.product_id);

        // Create negative stock adjustment for damaged items
        createStockAdjustment.run(
          item.product_id,
          -item.quantity_returned,
          `Return #${return_number} - ${item.condition} condition (not restocked)`
        );
      }
    }

    // Update customer balance (if applicable)
    // Customer credit increases by return amount
    if (params.refund_method === 'Credit Note') {
      const currencyField =
        params.currency === 'USD' ? 'current_balance_usd' : 'current_balance_ugx';

      db.prepare(`
        UPDATE customers
        SET ${currencyField} = ${currencyField} + ?,
            advance_balance_${params.currency.toLowerCase()} = advance_balance_${params.currency.toLowerCase()} + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(total_amount, total_amount, params.customer_id);
    }

    // Commit transaction
    db.exec('COMMIT');

    // Fetch and return the created return
    const salesReturn = db
      .prepare(
        `SELECT sr.*, c.name as customer_name, si.invoice_number
         FROM sales_returns sr
         LEFT JOIN customers c ON sr.customer_id = c.id
         LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
         WHERE sr.id = ?`
      )
      .get(return_id);

    const returnItems = db
      .prepare(
        `SELECT sri.*, p.unit
         FROM sales_return_items sri
         LEFT JOIN products p ON sri.product_id = p.id
         WHERE sri.return_id = ?`
      )
      .all(return_id);

    return {
      return: salesReturn,
      items: returnItems,
    };
  } catch (error: any) {
    // Rollback on error
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Get all sales returns
 */
export function listSalesReturns(params?: {
  search?: string;
  customer_id?: number;
  refund_status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDatabase();

  let query = `
    SELECT sr.*,
           c.name as customer_name,
           si.invoice_number
    FROM sales_returns sr
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (params?.search) {
    query += ` AND (sr.return_number LIKE ? OR c.name LIKE ? OR sr.reason LIKE ?)`;
    const searchTerm = `%${params.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params?.customer_id) {
    query += ` AND sr.customer_id = ?`;
    queryParams.push(params.customer_id);
  }

  if (params?.refund_status) {
    query += ` AND sr.refund_status = ?`;
    queryParams.push(params.refund_status);
  }

  if (params?.date_from) {
    query += ` AND sr.return_date >= ?`;
    queryParams.push(params.date_from);
  }

  if (params?.date_to) {
    query += ` AND sr.return_date <= ?`;
    queryParams.push(params.date_to);
  }

  query += ` ORDER BY sr.return_date DESC, sr.id DESC`;

  if (params?.limit) {
    query += ` LIMIT ?`;
    queryParams.push(params.limit);
  }

  if (params?.offset) {
    query += ` OFFSET ?`;
    queryParams.push(params.offset);
  }

  const returns = db.prepare(query).all(...queryParams);

  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total
    FROM sales_returns sr
    LEFT JOIN customers c ON sr.customer_id = c.id
    WHERE 1=1
  `;
  const countParams: any[] = [];

  if (params?.search) {
    countQuery += ` AND (sr.return_number LIKE ? OR c.name LIKE ? OR sr.reason LIKE ?)`;
    const searchTerm = `%${params.search}%`;
    countParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (params?.customer_id) {
    countQuery += ` AND sr.customer_id = ?`;
    countParams.push(params.customer_id);
  }

  if (params?.refund_status) {
    countQuery += ` AND sr.refund_status = ?`;
    countParams.push(params.refund_status);
  }

  if (params?.date_from) {
    countQuery += ` AND sr.return_date >= ?`;
    countParams.push(params.date_from);
  }

  if (params?.date_to) {
    countQuery += ` AND sr.return_date <= ?`;
    countParams.push(params.date_to);
  }

  const { total } = db.prepare(countQuery).get(...countParams) as any;

  return { returns, total };
}

/**
 * Get single sales return by ID
 */
export function getSalesReturn(id: number) {
  const db = getDatabase();

  const salesReturn = db
    .prepare(
      `SELECT sr.*,
              c.name as customer_name, c.phone as customer_phone,
              si.invoice_number, si.invoice_date
       FROM sales_returns sr
       LEFT JOIN customers c ON sr.customer_id = c.id
       LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
       WHERE sr.id = ?`
    )
    .get(id);

  if (!salesReturn) {
    return null;
  }

  const items = db
    .prepare(
      `SELECT sri.*, p.unit
       FROM sales_return_items sri
       LEFT JOIN products p ON sri.product_id = p.id
       WHERE sri.return_id = ?
       ORDER BY sri.id`
    )
    .all(id);

  return {
    ...salesReturn,
    items,
  };
}

/**
 * Update refund status
 */
export function updateRefundStatus(
  id: number,
  refund_status: string,
  refund_date?: string,
  refund_amount?: number
) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE sales_returns
    SET refund_status = ?,
        refund_date = ?,
        refund_amount = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(refund_status, refund_date || null, refund_amount || 0, id);

  return getSalesReturn(id);
}
