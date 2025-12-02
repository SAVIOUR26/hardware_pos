import { getDatabase, transaction, queryOne, query, execute } from '../database';
import Database from 'better-sqlite3';

/**
 * Inventory Service
 * Manages products, stock adjustments, and stock reporting
 */

interface ProductData {
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
  opening_stock?: number;
  is_active?: number;
}

/**
 * Create a new product
 */
export function createProduct(data: ProductData): any {
  return transaction((db: Database.Database) => {
    try {
      // Check for duplicate name or barcode
      if (data.barcode) {
        const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [data.barcode]);
        if (existing) {
          throw new Error(`Product with barcode ${data.barcode} already exists`);
        }
      }

      const result = execute(
        `INSERT INTO products (
          name, description, category, unit, barcode,
          cost_price_ugx, cost_price_usd, selling_price_ugx, selling_price_usd,
          current_stock, reserved_stock, reorder_level, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.description || null,
          data.category || null,
          data.unit,
          data.barcode || null,
          data.cost_price_ugx,
          data.cost_price_usd,
          data.selling_price_ugx,
          data.selling_price_usd,
          data.opening_stock || 0,
          0, // reserved_stock starts at 0
          data.reorder_level,
          data.is_active !== undefined ? data.is_active : 1,
        ],
      );

      const productId = result.lastInsertRowid as number;

      // If opening stock > 0, log it as adjustment
      if (data.opening_stock && data.opening_stock > 0) {
        execute(
          `INSERT INTO stock_adjustments (product_id, quantity, reason, notes)
           VALUES (?, ?, ?, ?)`,
          [productId, data.opening_stock, 'Opening Stock', 'Initial stock entry'],
        );
      }

      return {
        success: true,
        data: queryOne('SELECT * FROM products WHERE id = ?', [productId]),
      };
    } catch (error: any) {
      throw error;
    }
  });
}

/**
 * Update product
 */
export function updateProduct(id: number, data: Partial<ProductData>): any {
  try {
    const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      throw new Error('Product not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.unit !== undefined) {
      updates.push('unit = ?');
      params.push(data.unit);
    }
    if (data.barcode !== undefined) {
      updates.push('barcode = ?');
      params.push(data.barcode);
    }
    if (data.cost_price_ugx !== undefined) {
      updates.push('cost_price_ugx = ?');
      params.push(data.cost_price_ugx);
    }
    if (data.cost_price_usd !== undefined) {
      updates.push('cost_price_usd = ?');
      params.push(data.cost_price_usd);
    }
    if (data.selling_price_ugx !== undefined) {
      updates.push('selling_price_ugx = ?');
      params.push(data.selling_price_ugx);
    }
    if (data.selling_price_usd !== undefined) {
      updates.push('selling_price_usd = ?');
      params.push(data.selling_price_usd);
    }
    if (data.reorder_level !== undefined) {
      updates.push('reorder_level = ?');
      params.push(data.reorder_level);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    return {
      success: true,
      data: queryOne('SELECT * FROM products WHERE id = ?', [id]),
    };
  } catch (error: any) {
    return {
      success: false,
      error: { code: 'UPDATE_PRODUCT_ERROR', message: error.message },
    };
  }
}

/**
 * Get product by ID
 */
export function getProduct(id: number): any {
  try {
    const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
    }

    // Add computed fields
    const availableStock = product.current_stock - product.reserved_stock;
    const stockValue = product.current_stock * product.cost_price_ugx;
    const isLowStock = availableStock <= product.reorder_level;
    const isOutOfStock = availableStock <= 0;

    return {
      success: true,
      data: {
        ...product,
        available_stock: availableStock,
        stock_value_ugx: stockValue,
        is_low_stock: isLowStock,
        is_out_of_stock: isOutOfStock,
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'GET_PRODUCT_ERROR', message: error.message } };
  }
}

/**
 * List products with filters
 */
export function listProducts(filters?: any): any {
  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.search) {
      whereClauses.push('(name LIKE ? OR barcode LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.category) {
      whereClauses.push('category = ?');
      params.push(filters.category);
    }

    if (filters?.is_active !== undefined) {
      whereClauses.push('is_active = ?');
      params.push(filters.is_active);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const products = query<any>(
      `SELECT *,
        (current_stock - reserved_stock) as available_stock,
        (current_stock * cost_price_ugx) as stock_value_ugx
      FROM products
      ${whereClause}
      ORDER BY name ASC
      LIMIT ? OFFSET ?`,
      [...params, filters?.limit || 100, filters?.offset || 0],
    );

    // Filter by stock status if requested
    let filteredProducts = products;
    if (filters?.stock_status === 'low') {
      filteredProducts = products.filter((p) => p.available_stock <= p.reorder_level && p.available_stock > 0);
    } else if (filters?.stock_status === 'out') {
      filteredProducts = products.filter((p) => p.available_stock <= 0);
    } else if (filters?.stock_status === 'good') {
      filteredProducts = products.filter((p) => p.available_stock > p.reorder_level);
    }

    const totalCount = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM products ${whereClause}`,
      params,
    );

    return {
      success: true,
      data: {
        products: filteredProducts,
        total: totalCount?.count || 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'LIST_PRODUCTS_ERROR', message: error.message } };
  }
}

/**
 * Adjust stock (manual adjustment)
 */
export function adjustStock(productId: number, quantity: number, reason: string, notes?: string, approvedBy?: string): any {
  return transaction((db: Database.Database) => {
    try {
      const product = queryOne('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        throw new Error('Product not found');
      }

      // Update stock
      execute('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [quantity, productId]);

      // Log adjustment
      execute(
        `INSERT INTO stock_adjustments (product_id, quantity, reason, notes, approved_by)
         VALUES (?, ?, ?, ?, ?)`,
        [productId, quantity, reason, notes || null, approvedBy || null],
      );

      return {
        success: true,
        data: queryOne('SELECT * FROM products WHERE id = ?', [productId]),
        message: `Stock adjusted by ${quantity}. Reason: ${reason}`,
      };
    } catch (error: any) {
      throw error;
    }
  });
}

/**
 * Get stock report
 */
export function getStockReport(filters?: any): any {
  try {
    const products = query<any>(
      `SELECT
        p.*,
        (p.current_stock - p.reserved_stock) as available_stock,
        (p.current_stock * p.cost_price_ugx) as stock_value_ugx,
        COALESCE(sold.total_sold, 0) as total_sold,
        COALESCE(purchased.total_purchased, 0) as total_purchased
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_sold
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        WHERE si.is_quotation = 0
        GROUP BY product_id
      ) sold ON p.id = sold.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_purchased
        FROM purchase_invoice_items
        GROUP BY product_id
      ) purchased ON p.id = purchased.product_id
      WHERE p.is_active = 1
      ORDER BY p.name ASC`,
    );

    // Calculate summary
    const summary = {
      total_products: products.length,
      total_stock_value_ugx: products.reduce((sum, p) => sum + p.stock_value_ugx, 0),
      low_stock_count: products.filter((p) => p.available_stock <= p.reorder_level && p.available_stock > 0).length,
      out_of_stock_count: products.filter((p) => p.available_stock <= 0).length,
      total_reserved: products.reduce((sum, p) => sum + p.reserved_stock, 0),
    };

    return {
      success: true,
      data: {
        products,
        summary,
      },
    };
  } catch (error: any) {
    return { success: false, error: { code: 'STOCK_REPORT_ERROR', message: error.message } };
  }
}

/**
 * Get low stock alerts
 */
export function getLowStockAlerts(): any {
  try {
    const products = query<any>(
      `SELECT *,
        (current_stock - reserved_stock) as available_stock
      FROM products
      WHERE (current_stock - reserved_stock) <= reorder_level
        AND is_active = 1
      ORDER BY (current_stock - reserved_stock) ASC`,
    );

    return {
      success: true,
      data: products,
    };
  } catch (error: any) {
    return { success: false, error: { code: 'LOW_STOCK_ERROR', message: error.message } };
  }
}

/**
 * Delete product (soft delete)
 */
export function deleteProduct(id: number): any {
  try {
    // Check if product has transactions
    const hasTransactions = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales_invoice_items WHERE product_id = ?`,
      [id],
    );

    if (hasTransactions && hasTransactions.count > 0) {
      // Soft delete (mark as inactive)
      execute('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
      return {
        success: true,
        message: 'Product marked as inactive (has transaction history)',
      };
    } else {
      // Hard delete
      execute('DELETE FROM products WHERE id = ?', [id]);
      return {
        success: true,
        message: 'Product deleted successfully',
      };
    }
  } catch (error: any) {
    return { success: false, error: { code: 'DELETE_PRODUCT_ERROR', message: error.message } };
  }
}
