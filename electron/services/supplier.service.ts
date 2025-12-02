import Database from 'better-sqlite3';
import { getDatabase, transaction, queryOne, query, execute } from '../database';

/**
 * Supplier Service
 *
 * Features:
 * - Create, read, update, delete suppliers
 * - Search suppliers by name, phone, company
 * - Get supplier transaction history
 * - Track outstanding payables
 */

interface SupplierData {
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  bank_account?: string;
  payment_terms?: string;
  opening_balance_ugx?: number;
  opening_balance_usd?: number;
}

/**
 * Create a new supplier
 */
export function createSupplier(data: SupplierData): any {
  try {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      return {
        success: false,
        error: { message: 'Supplier name is required' },
      };
    }

    // Check for duplicate phone (if provided)
    if (data.phone) {
      const existing = queryOne<any>(
        'SELECT id FROM suppliers WHERE phone = ? AND is_active = 1',
        [data.phone]
      );
      if (existing) {
        return {
          success: false,
          error: { message: 'A supplier with this phone number already exists' },
        };
      }
    }

    const result = execute(
      `INSERT INTO suppliers (
        name, company_name, phone, email, address, tin,
        bank_account, payment_terms,
        opening_balance_ugx, opening_balance_usd,
        current_balance_ugx, current_balance_usd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name.trim(),
        data.company_name?.trim() || null,
        data.phone?.trim() || null,
        data.email?.trim() || null,
        data.address?.trim() || null,
        data.tin?.trim() || null,
        data.bank_account?.trim() || null,
        data.payment_terms?.trim() || null,
        data.opening_balance_ugx || 0,
        data.opening_balance_usd || 0,
        data.opening_balance_ugx || 0, // Initial current balance
        data.opening_balance_usd || 0,
      ]
    );

    const supplier = queryOne<any>('SELECT * FROM suppliers WHERE id = ?', [
      result.lastInsertRowid,
    ]);

    return {
      success: true,
      data: supplier,
    };
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Get supplier by ID
 */
export function getSupplier(id: number): any {
  try {
    const supplier = queryOne<any>(
      'SELECT * FROM suppliers WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!supplier) {
      return {
        success: false,
        error: { message: 'Supplier not found' },
      };
    }

    // Get transaction summary
    const stats = queryOne<any>(
      `SELECT
        COUNT(*) as total_purchases,
        COALESCE(SUM(total_amount_ugx), 0) as total_purchases_ugx,
        COALESCE(SUM(total_amount_ugx - amount_paid), 0) as outstanding_balance_ugx
      FROM purchase_invoices
      WHERE supplier_id = ?`,
      [id]
    );

    return {
      success: true,
      data: {
        ...supplier,
        stats,
      },
    };
  } catch (error: any) {
    console.error('Error getting supplier:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Get all suppliers with optional filters
 */
export function getAllSuppliers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): any {
  try {
    let sql = 'SELECT * FROM suppliers WHERE is_active = 1';
    const params: any[] = [];

    // Search by name, company_name, or phone
    if (filters?.search) {
      sql += ` AND (
        name LIKE ? OR
        company_name LIKE ? OR
        phone LIKE ?
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

    const suppliers = query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1';
    const countParams: any[] = [];
    if (filters?.search) {
      countSql += ` AND (
        name LIKE ? OR
        company_name LIKE ? OR
        phone LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    const { count } = queryOne<{ count: number }>(countSql, countParams) || { count: 0 };

    return {
      success: true,
      data: {
        suppliers,
        total: count,
      },
    };
  } catch (error: any) {
    console.error('Error getting suppliers:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Update supplier
 */
export function updateSupplier(id: number, data: Partial<SupplierData>): any {
  try {
    // Check if supplier exists
    const existing = queryOne<any>(
      'SELECT id FROM suppliers WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!existing) {
      return {
        success: false,
        error: { message: 'Supplier not found' },
      };
    }

    // Check for duplicate phone (if being updated)
    if (data.phone) {
      const duplicate = queryOne<any>(
        'SELECT id FROM suppliers WHERE phone = ? AND id != ? AND is_active = 1',
        [data.phone, id]
      );
      if (duplicate) {
        return {
          success: false,
          error: { message: 'A supplier with this phone number already exists' },
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
    if (data.company_name !== undefined) {
      fields.push('company_name = ?');
      values.push(data.company_name?.trim() || null);
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
    if (data.tin !== undefined) {
      fields.push('tin = ?');
      values.push(data.tin?.trim() || null);
    }
    if (data.bank_account !== undefined) {
      fields.push('bank_account = ?');
      values.push(data.bank_account?.trim() || null);
    }
    if (data.payment_terms !== undefined) {
      fields.push('payment_terms = ?');
      values.push(data.payment_terms?.trim() || null);
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
      `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const supplier = queryOne<any>('SELECT * FROM suppliers WHERE id = ?', [id]);

    return {
      success: true,
      data: supplier,
    };
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Delete supplier (soft delete)
 */
export function deleteSupplier(id: number): any {
  try {
    // Check if supplier exists
    const existing = queryOne<any>(
      'SELECT id FROM suppliers WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!existing) {
      return {
        success: false,
        error: { message: 'Supplier not found' },
      };
    }

    // Check if supplier has purchases
    const hasPurchases = queryOne<any>(
      'SELECT id FROM purchase_invoices WHERE supplier_id = ? LIMIT 1',
      [id]
    );
    if (hasPurchases) {
      return {
        success: false,
        error: { message: 'Cannot delete supplier with existing purchases' },
      };
    }

    execute(
      'UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    return {
      success: true,
      data: { message: 'Supplier deleted successfully' },
    };
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}

/**
 * Search suppliers (for autocomplete)
 */
export function searchSuppliers(searchTerm: string, limit: number = 10): any {
  try {
    const suppliers = query<any>(
      `SELECT id, name, company_name, phone, email
       FROM suppliers
       WHERE is_active = 1
       AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ?)
       ORDER BY name ASC
       LIMIT ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
    );

    return {
      success: true,
      data: suppliers,
    };
  } catch (error: any) {
    console.error('Error searching suppliers:', error);
    return {
      success: false,
      error: { message: error.message },
    };
  }
}
