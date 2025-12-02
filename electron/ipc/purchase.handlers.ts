import { ipcMain } from 'electron';
import * as purchaseService from '../services/purchase.service';

/**
 * Purchase IPC Handlers
 */

export function registerPurchaseHandlers() {
  // Create purchase invoice
  ipcMain.handle('purchase:create', async (event, data) => {
    try {
      return purchaseService.createPurchaseInvoice(data);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_PURCHASE_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get purchase invoice
  ipcMain.handle('purchase:get', async (event, id) => {
    try {
      return purchaseService.getPurchaseInvoice(id);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_PURCHASE_ERROR',
          message: error.message,
        },
      };
    }
  });

  // List purchase invoices
  ipcMain.handle('purchase:list', async (event, filters) => {
    try {
      return purchaseService.listPurchaseInvoices(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LIST_PURCHASES_ERROR',
          message: error.message,
        },
      };
    }
  });

  console.log('Purchase IPC handlers registered');
}
