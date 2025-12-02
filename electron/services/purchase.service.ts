import Database from 'better-sqlite3';
import { getDatabase, transaction, queryOne, query, execute } from '../database';
import { format } from 'date-fns';

/**
 * Purchase Service
 * Manages purchase invoices and updates product stock/cost prices
 */

interface PurchaseInvoiceData {
  supplier_id: number;
  purchase_date: string;
  supplier_invoice_number?: string;
  currency: string;
  exchange_rate: number;
  items: PurchaseInvoiceItemData[];
  payment_status: string;
  amount_paid?: number;
  payment_method?: string;
}

interface PurchaseInvoiceItemData {
  product_id: number;
  quantity: number;
  unit_price: number;
  tax_percent?: number;
  update_cost_price?: boolean;
}

function generatePurchaseNumber(): string {
  const today = format(new Date(), 'yyyyMMdd');
  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM purchase_invoices WHERE purchase_number LIKE ?',
    [`PUR-${today}-%`],
  );
  const count = (result?.count || 0) + 1;
  return `PUR-${today}-${count.toString().padStart(4, '0')}`;
}

export function createPurchaseInvoice(data: PurchaseInvoiceData): any {
  return transaction((db: Database.Database) => {
    try {
      const supplier = queryOne('SELECT id, name FROM suppliers WHERE id = ?', [data.supplier_id]);
      if (!supplier) throw new Error('Supplier not found');

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      for (const item of data.items) {
        const lineSubtotal = item.quantity * item.unit_price;
        const lineTax = lineSubtotal * ((item.tax_percent || 0) / 100);
        subtotal += lineSubtotal;
        taxAmount += lineTax;
      }
      const totalAmount = subtotal + taxAmount;
      const totalAmountUgx = data.currency === 'USD' ? totalAmount * data.exchange_rate : totalAmount;

      const purchaseNumber = generatePurchaseNumber();

      const result = execute(
        `INSERT INTO purchase_invoices (
          purchase_number, supplier_id, supplier_invoice_number, purchase_date,
          currency, exchange_rate, subtotal, tax_amount, total_amount, total_amount_ugx,
          payment_status, amount_paid, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseNumber, data.supplier_id, data.supplier_invoice_number || null, data.purchase_date,
          data.currency, data.exchange_rate, subtotal, taxAmount, totalAmount, totalAmountUgx,
          data.payment_status, data.amount_paid || 0, data.payment_method || null,
        ],
      );

      const invoiceId = result.lastInsertRowid as number;

      // Insert items and update stock
      for (const item of data.items) {
        const product = queryOne<any>('SELECT name FROM products WHERE id = ?', [item.product_id]);
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        const lineSubtotal = item.quantity * item.unit_price;
        const lineTax = lineSubtotal * ((item.tax_percent || 0) / 100);
        const lineTotal = lineSubtotal + lineTax;

        execute(
          `INSERT INTO purchase_invoice_items (
            invoice_id, product_id, product_name, quantity, unit_price, tax_percent, line_total, update_cost_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoiceId, item.product_id, product.name, item.quantity, item.unit_price, item.tax_percent || 0, lineTotal, item.update_cost_price ? 1 : 0],
        );

        // Increase stock
        execute('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.product_id]);

        // Update cost price if requested
        if (item.update_cost_price) {
          const costField = data.currency === 'USD' ? 'cost_price_usd' : 'cost_price_ugx';
          execute(`UPDATE products SET ${costField} = ? WHERE id = ?`, [item.unit_price, item.product_id]);
        }
      }

      // If paid, record transaction
      if (data.payment_status === 'Paid' && data.amount_paid && data.amount_paid > 0) {
        execute(
          `INSERT INTO cash_transactions (
            transaction_date, transaction_type, currency, amount, description, reference, purchase_invoice_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [data.purchase_date, 'Payment', data.currency, data.amount_paid, `Payment for ${purchaseNumber} to ${supplier.name}`, purchaseNumber, invoiceId],
        );
      }

      // Update supplier balance
      const balanceField = data.currency === 'USD' ? 'current_balance_usd' : 'current_balance_ugx';
      execute(`UPDATE suppliers SET ${balanceField} = ${balanceField} + ? WHERE id = ?`, [totalAmount - (data.amount_paid || 0), data.supplier_id]);

      return {
        success: true,
        data: {
          ...queryOne('SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]),
          items: query('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?', [invoiceId]),
        },
      };
    } catch (error: any) {
      throw error;
    }
  });
}

export function getPurchaseInvoice(id: number): any {
  try {
    const invoice = queryOne(
      `SELECT pi.*, s.name as supplier_name FROM purchase_invoices pi
       JOIN suppliers s ON pi.supplier_id = s.id WHERE pi.id = ?`,
      [id],
    );
    if (!invoice) return { success: false, error: { code: 'NOT_FOUND', message: 'Purchase invoice not found' } };

    return {
      success: true,
      data: {
        ...invoice,
        items: query('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?', [id]),
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'GET_PURCHASE_ERROR', message: error.message } };
  }
}

export function listPurchaseInvoices(filters?: any): any {
  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.search) {
      whereClauses.push('(pi.purchase_number LIKE ? OR s.name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters?.supplier_id) {
      whereClauses.push('pi.supplier_id = ?');
      params.push(filters.supplier_id);
    }
    if (filters?.payment_status) {
      whereClauses.push('pi.payment_status = ?');
      params.push(filters.payment_status);
    }
    if (filters?.date_range) {
      whereClauses.push('pi.purchase_date >= ? AND pi.purchase_date <= ?');
      params.push(filters.date_range.startDate, filters.date_range.endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const invoices = query(
      `SELECT pi.*, s.name as supplier_name
       FROM purchase_invoices pi
       JOIN suppliers s ON pi.supplier_id = s.id
       ${whereClause}
       ORDER BY pi.purchase_date DESC LIMIT ? OFFSET ?`,
      [...params, filters?.limit || 50, filters?.offset || 0],
    );

    const total = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM purchase_invoices pi JOIN suppliers s ON pi.supplier_id = s.id ${whereClause}`, params);

    return { success: true, data: { invoices, total: total?.count || 0 } };
  } catch (error: any) {
    return { success: false, error: { code: 'LIST_PURCHASES_ERROR', message: error.message } };
  }
}
