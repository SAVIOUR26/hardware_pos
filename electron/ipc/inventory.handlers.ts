import { ipcMain } from 'electron';
import * as inventoryService from '../services/inventory.service';

/**
 * Inventory IPC Handlers
 */

export function registerInventoryHandlers() {
  // Create product
  ipcMain.handle('inventory:createProduct', async (event, data) => {
    try {
      return inventoryService.createProduct(data);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_PRODUCT_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Update product
  ipcMain.handle('inventory:updateProduct', async (event, id, data) => {
    try {
      return inventoryService.updateProduct(id, data);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_PRODUCT_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get product
  ipcMain.handle('inventory:getProduct', async (event, id) => {
    try {
      return inventoryService.getProduct(id);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_PRODUCT_ERROR',
          message: error.message,
        },
      };
    }
  });

  // List products
  ipcMain.handle('inventory:listProducts', async (event, filters) => {
    try {
      return inventoryService.listProducts(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LIST_PRODUCTS_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Adjust stock
  ipcMain.handle('inventory:adjustStock', async (event, productId, quantity, reason, notes, approvedBy) => {
    try {
      return inventoryService.adjustStock(productId, quantity, reason, notes, approvedBy);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'ADJUST_STOCK_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get stock report
  ipcMain.handle('inventory:getStockReport', async (event, filters) => {
    try {
      return inventoryService.getStockReport(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STOCK_REPORT_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get low stock alerts
  ipcMain.handle('inventory:getLowStockAlerts', async () => {
    try {
      return inventoryService.getLowStockAlerts();
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LOW_STOCK_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Delete product
  ipcMain.handle('inventory:deleteProduct', async (event, id) => {
    try {
      return inventoryService.deleteProduct(id);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_PRODUCT_ERROR',
          message: error.message,
        },
      };
    }
  });

  console.log('Inventory IPC handlers registered');
}
