import Database from 'better-sqlite3';
import { getDatabase, transaction, queryOne, query, execute } from '../database';
import { format } from 'date-fns';

/**
 * Delivery Service
 * ⭐ Handles "Mark as Taken" workflow
 *
 * Key Functions:
 * - Create delivery notes when customers collect goods
 * - Mark invoice items as "Taken" (full or partial)
 * - Release reserved stock and reduce actual stock
 * - Update delivery status at item and invoice levels
 */

interface MarkAsTakenRequest {
  invoice_id: number;
  items: MarkAsTakenItem[];
  delivery_date: string;
  delivered_by?: string;
  received_by?: string;
  vehicle_number?: string;
  notes?: string;
  show_prices?: boolean;
  show_totals?: boolean;
}

interface MarkAsTakenItem {
  invoice_item_id: number;
  product_id: number;
  quantity_to_deliver: number;
}

/**
 * Generate delivery note number
 * Format: DN-YYYYMMDD-0001
 */
function generateDeliveryNoteNumber(): string {
  const today = format(new Date(), 'yyyyMMdd');

  const result = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM delivery_notes
     WHERE delivery_note_number LIKE ?`,
    [`DN-${today}-%`],
  );

  const count = (result?.count || 0) + 1;
  const sequence = count.toString().padStart(4, '0');

  return `DN-${today}-${sequence}`;
}

/**
 * Mark items as taken (delivered to customer)
 * ⭐ CRITICAL FUNCTION - Implements delivery workflow
 *
 * Process:
 * 1. Validate invoice and items
 * 2. For each item being delivered:
 *    - Release from reserved stock: reserved_stock -= quantity
 *    - Reduce actual stock: current_stock -= quantity
 *    - Update quantity_delivered
 *    - Update item delivery_status
 * 3. Update invoice delivery_status
 * 4. Create delivery note
 */
export function markAsTaken(request: MarkAsTakenRequest): any {
  return transaction((db: Database.Database) => {
    try {
      // 1. Validate invoice exists and has "Not Taken" status
      const invoice = queryOne<any>(
        `SELECT * FROM sales_invoices WHERE id = ? AND delivery_status IN ('Not Taken', 'Partially Taken')`,
        [request.invoice_id],
      );

      if (!invoice) {
        throw new Error('Invoice not found or already fully delivered');
      }

      // 2. Create delivery note
      const deliveryNoteNumber = generateDeliveryNoteNumber();

      const deliveryNoteResult = execute(
        `INSERT INTO delivery_notes (
          delivery_note_number, sales_invoice_id, delivery_date,
          delivered_by, received_by, vehicle_number, notes,
          show_prices, show_totals
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryNoteNumber,
          request.invoice_id,
          request.delivery_date,
          request.delivered_by || null,
          request.received_by || null,
          request.vehicle_number || null,
          request.notes || null,
          request.show_prices ? 1 : 0,
          request.show_totals ? 1 : 0,
        ],
      );

      const deliveryNoteId = deliveryNoteResult.lastInsertRowid as number;

      // 3. Process each item being delivered
      for (const item of request.items) {
        // Get invoice item
        const invoiceItem = queryOne<any>(
          `SELECT * FROM sales_invoice_items WHERE id = ? AND invoice_id = ?`,
          [item.invoice_item_id, request.invoice_id],
        );

        if (!invoiceItem) {
          throw new Error(`Invoice item ${item.invoice_item_id} not found`);
        }

        // Validate quantity
        const remainingQty = invoiceItem.quantity - invoiceItem.quantity_delivered;
        if (item.quantity_to_deliver > remainingQty) {
          throw new Error(
            `Cannot deliver ${item.quantity_to_deliver} of ${invoiceItem.product_name}. Only ${remainingQty} remaining.`,
          );
        }

        // Get product
        const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [item.product_id]);

        if (!product) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        // Validate reserved stock
        if (product.reserved_stock < item.quantity_to_deliver) {
          throw new Error(
            `Insufficient reserved stock for ${product.name}. Reserved: ${product.reserved_stock}, Trying to deliver: ${item.quantity_to_deliver}`,
          );
        }

        // ⭐ UPDATE STOCK:
        // 1. Release from reserved stock
        // 2. Reduce actual stock
        execute(
          `UPDATE products
           SET reserved_stock = reserved_stock - ?,
               current_stock = current_stock - ?
           WHERE id = ?`,
          [item.quantity_to_deliver, item.quantity_to_deliver, item.product_id],
        );

        // Update invoice item delivery tracking
        const newQuantityDelivered = invoiceItem.quantity_delivered + item.quantity_to_deliver;
        const newDeliveryStatus = newQuantityDelivered >= invoiceItem.quantity ? 'Taken' : 'Partially Taken';

        execute(
          `UPDATE sales_invoice_items
           SET quantity_delivered = ?,
               delivery_status = ?
           WHERE id = ?`,
          [newQuantityDelivered, newDeliveryStatus, item.invoice_item_id],
        );

        // Create delivery note item
        const lineTotal = (invoiceItem.line_total / invoiceItem.quantity) * item.quantity_to_deliver;

        execute(
          `INSERT INTO delivery_note_items (
            delivery_note_id, sales_invoice_item_id, product_id,
            product_name, quantity_delivered, unit_price, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            deliveryNoteId,
            item.invoice_item_id,
            item.product_id,
            invoiceItem.product_name,
            item.quantity_to_deliver,
            invoiceItem.unit_price,
            lineTotal,
          ],
        );
      }

      // 4. Update invoice delivery status
      // Check if all items are fully delivered
      const allItems = query<any>('SELECT * FROM sales_invoice_items WHERE invoice_id = ?', [request.invoice_id]);

      const allDelivered = allItems.every((item: any) => item.quantity_delivered >= item.quantity);
      const anyDelivered = allItems.some((item: any) => item.quantity_delivered > 0);

      let newInvoiceStatus = 'Not Taken';
      if (allDelivered) {
        newInvoiceStatus = 'Taken';
      } else if (anyDelivered) {
        newInvoiceStatus = 'Partially Taken';
      }

      execute('UPDATE sales_invoices SET delivery_status = ? WHERE id = ?', [newInvoiceStatus, request.invoice_id]);

      // 5. Return delivery note with details
      const deliveryNote = queryOne(
        `SELECT
          dn.*,
          si.invoice_number,
          si.total_amount,
          si.currency,
          c.name as customer_name,
          c.phone as customer_phone,
          c.address as customer_address
        FROM delivery_notes dn
        JOIN sales_invoices si ON dn.sales_invoice_id = si.id
        JOIN customers c ON si.customer_id = c.id
        WHERE dn.id = ?`,
        [deliveryNoteId],
      );

      const deliveryItems = query(
        `SELECT * FROM delivery_note_items WHERE delivery_note_id = ?`,
        [deliveryNoteId],
      );

      return {
        success: true,
        data: {
          delivery_note: deliveryNote,
          items: deliveryItems,
          invoice_new_status: newInvoiceStatus,
        },
        message: `Delivery note ${deliveryNoteNumber} created successfully. Invoice status: ${newInvoiceStatus}`,
      };
    } catch (error: any) {
      console.error('Error marking as taken:', error);
      throw error;
    }
  });
}

/**
 * Get delivery note by ID
 */
export function getDeliveryNote(id: number): any {
  try {
    const deliveryNote = queryOne(
      `SELECT
        dn.*,
        si.invoice_number,
        si.total_amount,
        si.currency,
        si.exchange_rate,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        c.company_name
      FROM delivery_notes dn
      JOIN sales_invoices si ON dn.sales_invoice_id = si.id
      JOIN customers c ON si.customer_id = c.id
      WHERE dn.id = ?`,
      [id],
    );

    if (!deliveryNote) {
      return {
        success: false,
        error: {
          code: 'DELIVERY_NOTE_NOT_FOUND',
          message: `Delivery note with ID ${id} not found`,
        },
      };
    }

    const items = query(
      `SELECT
        dni.*,
        p.unit
      FROM delivery_note_items dni
      JOIN products p ON dni.product_id = p.id
      WHERE dni.delivery_note_id = ?`,
      [id],
    );

    return {
      success: true,
      data: {
        ...deliveryNote,
        items,
      },
    };
  } catch (error: any) {
    console.error('Error getting delivery note:', error);
    return {
      success: false,
      error: {
        code: 'GET_DELIVERY_NOTE_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * List delivery notes
 */
export function listDeliveryNotes(filters?: any): any {
  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.search) {
      whereClauses.push('(dn.delivery_note_number LIKE ? OR si.invoice_number LIKE ? OR c.name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.sales_invoice_id) {
      whereClauses.push('dn.sales_invoice_id = ?');
      params.push(filters.sales_invoice_id);
    }

    if (filters?.date_range) {
      whereClauses.push('dn.delivery_date >= ? AND dn.delivery_date <= ?');
      params.push(filters.date_range.startDate, filters.date_range.endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const notes = query(
      `SELECT
        dn.*,
        si.invoice_number,
        c.name as customer_name,
        COUNT(dni.id) as total_items
      FROM delivery_notes dn
      JOIN sales_invoices si ON dn.sales_invoice_id = si.id
      JOIN customers c ON si.customer_id = c.id
      LEFT JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
      ${whereClause}
      GROUP BY dn.id
      ORDER BY dn.delivery_date DESC, dn.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, filters?.limit || 50, filters?.offset || 0],
    );

    const totalCount = queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT dn.id) as count
      FROM delivery_notes dn
      JOIN sales_invoices si ON dn.sales_invoice_id = si.id
      JOIN customers c ON si.customer_id = c.id
      ${whereClause}`,
      params,
    );

    return {
      success: true,
      data: {
        notes,
        total: totalCount?.count || 0,
        page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
        pageSize: filters?.limit || 50,
      },
    };
  } catch (error: any) {
    console.error('Error listing delivery notes:', error);
    return {
      success: false,
      error: {
        code: 'LIST_DELIVERY_NOTES_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Get delivery summary statistics
 */
export function getDeliverySummary(): any {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Total deliveries
    const totalDeliveries = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM delivery_notes');

    // Deliveries today
    const deliveriesToday = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM delivery_notes WHERE delivery_date = ?',
      [today],
    );

    // Total items delivered (all time)
    const totalItems = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM delivery_note_items',
    );

    // Total value delivered (all time)
    const totalValue = queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(dni.line_total * CASE WHEN si.currency = 'USD' THEN si.exchange_rate ELSE 1 END), 0) as total
      FROM delivery_note_items dni
      JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
      JOIN sales_invoices si ON dn.sales_invoice_id = si.id`,
    );

    // Pending deliveries (invoices with "Not Taken" status)
    const pendingDeliveries = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales_invoices
      WHERE delivery_status IN ('Not Taken', 'Partially Taken')`,
    );

    return {
      success: true,
      data: {
        total_deliveries: totalDeliveries?.count || 0,
        deliveries_today: deliveriesToday?.count || 0,
        total_items_delivered: totalItems?.count || 0,
        total_value_delivered_ugx: totalValue?.total || 0,
        pending_deliveries: pendingDeliveries?.count || 0,
      },
    };
  } catch (error: any) {
    console.error('Error getting delivery summary:', error);
    return {
      success: false,
      error: {
        code: 'DELIVERY_SUMMARY_ERROR',
        message: error.message,
      },
    };
  }
}
