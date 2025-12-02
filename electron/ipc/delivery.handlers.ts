import { ipcMain } from 'electron';
import * as deliveryService from '../services/delivery.service';

/**
 * Delivery IPC Handlers
 * ⭐ Handles "Mark as Taken" workflow
 */

export function registerDeliveryHandlers() {
  // Mark items as taken (create delivery note)
  ipcMain.handle('delivery:markAsTaken', async (event, request) => {
    try {
      return deliveryService.markAsTaken(request);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'MARK_AS_TAKEN_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get delivery note by ID
  ipcMain.handle('delivery:get', async (event, id) => {
    try {
      return deliveryService.getDeliveryNote(id);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_DELIVERY_NOTE_ERROR',
          message: error.message,
        },
      };
    }
  });

  // List delivery notes
  ipcMain.handle('delivery:list', async (event, filters) => {
    try {
      return deliveryService.listDeliveryNotes(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LIST_DELIVERY_NOTES_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get delivery summary
  ipcMain.handle('delivery:getSummary', async () => {
    try {
      return deliveryService.getDeliverySummary();
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELIVERY_SUMMARY_ERROR',
          message: error.message,
        },
      };
    }
  });

  console.log('Delivery IPC handlers registered');
}
