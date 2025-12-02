import Database from 'better-sqlite3';
import { getDatabase, transaction, queryOne, query, execute } from '../database';

/**
 * Customer Service
 *
 * Features:
 * - Create, read, update, delete customers
 * - Search customers by name, phone, email
 * - Get customer transaction history
 * - Track outstanding balances
 */

interface CustomerData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  credit_limit?: number;
  notes?: string;
}

/**
 * Create a new customer
 */
export function createCustomer(data: CustomerData): any {
  try {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      return {
        success: false,
        error: { message: 'Customer name is required' },
      };
    }

    // Check for duplicate phone (if provided)
    if (data.phone) {
      const existing = queryOne<any>(
        'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0',
        [data.phone]
      );
      if (existing) {
        return {
          success: false,
          error: { message: 'A customer with this phone number already exists' },
        };
      }
    }

    const result = execute(
      `INSERT INTO customers (
        name, phone, email, address, tax_id, credit_limit, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name.trim(),
        data.phone?.trim() || null,
        data.email?.trim() || null,
        data.address?.trim() || null,
        data.tax_id?.trim() || null,
        data.credit_limit || 0,
        data.notes?.trim() || null,
      ]
    );

    const customer = queryOne<any>('SELECT * FROM customers WHERE id = ?', [
      result.lastInsertRowid,
    ]);

    return {
      success: true,
      data: customer,
    };
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Get customer by ID
 */
export function getCustomer(id: number): any {
  try {
    const customer = queryOne<any>(
      'SELECT * FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!customer) {
      return {
        success: false,
        error: { message: 'Customer not found' },
      };
    }

    // Get transaction summary
    const stats = queryOne<any>(
      `SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount_ugx), 0) as total_sales_ugx,
        COALESCE(SUM(total_amount_ugx - amount_paid), 0) as outstanding_balance_ugx
      FROM sales_invoices
      WHERE customer_id = ? AND is_quotation = 0`,
      [id]
    );

    return {
      success: true,
      data: {
        ...customer,
        stats,
      },
    };
  } catch (error: any) {
    console.error('Error getting customer:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Get all customers with optional filters
 */
export function getAllCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): any {
  try {
    let sql = 'SELECT * FROM customers WHERE is_deleted = 0';
    const params: any[] = [];

    // Search by name, phone, or email
    if (filters?.search) {
      sql += ` AND (
        name LIKE ? OR
        phone LIKE ? OR
        email LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY name ASC';

    // Pagination
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const customers = query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0';
    const countParams: any[] = [];
    if (filters?.search) {
      countSql += ` AND (
        name LIKE ? OR
        phone LIKE ? OR
        email LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    const { count } = queryOne<{ count: number }>(countSql, countParams) || { count: 0 };

    return {
      success: true,
      data: {
        customers,
        total: count,
      },
    };
  } catch (error: any) {
    console.error('Error getting customers:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Update customer
 */
export function updateCustomer(id: number, data: Partial<CustomerData>): any {
  try {
    // Check if customer exists
    const existing = queryOne<any>(
      'SELECT id FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!existing) {
      return {
        success: false,
        error: { message: 'Customer not found' },
      };
    }

    // Check for duplicate phone (if being updated)
    if (data.phone) {
      const duplicate = queryOne<any>(
        'SELECT id FROM customers WHERE phone = ? AND id != ? AND is_deleted = 0',
        [data.phone, id]
      );
      if (duplicate) {
        return {
          success: false,
          error: { message: 'A customer with this phone number already exists' },
        };
      }
    }

    // Build update query dynamically
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone?.trim() || null);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email?.trim() || null);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address?.trim() || null);
    }
    if (data.tax_id !== undefined) {
      fields.push('tax_id = ?');
      values.push(data.tax_id?.trim() || null);
    }
    if (data.credit_limit !== undefined) {
      fields.push('credit_limit = ?');
      values.push(data.credit_limit);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes?.trim() || null);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: { message: 'No fields to update' },
      };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    execute(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const customer = queryOne<any>('SELECT * FROM customers WHERE id = ?', [id]);

    return {
      success: true,
      data: customer,
    };
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Delete customer (soft delete)
 */
export function deleteCustomer(id: number): any {
  try {
    // Check if customer exists
    const existing = queryOne<any>(
      'SELECT id FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!existing) {
      return {
        success: false,
        error: { message: 'Customer not found' },
      };
    }

    // Check if customer has invoices
    const hasInvoices = queryOne<any>(
      'SELECT id FROM sales_invoices WHERE customer_id = ? LIMIT 1',
      [id]
    );
    if (hasInvoices) {
      return {
        success: false,
        error: { message: 'Cannot delete customer with existing invoices' },
      };
    }

    execute(
      'UPDATE customers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    return {
      success: true,
      data: { message: 'Customer deleted successfully' },
    };
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Search customers (for autocomplete)
 */
export function searchCustomers(searchTerm: string, limit: number = 10): any {
  try {
    const customers = query<any>(
      `SELECT id, name, phone, email
       FROM customers
       WHERE is_deleted = 0
       AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
       ORDER BY name ASC
       LIMIT ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
    );

    return {
      success: true,
      data: customers,
    };
  } catch (error: any) {
    console.error('Error searching customers:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}
