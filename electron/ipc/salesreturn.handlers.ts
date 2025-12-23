/**
 * IPC Handlers for Sales Returns
 */

import { ipcMain } from 'electron';
import * as SalesReturnService from '../services/salesreturn.service';

export function registerSalesReturnHandlers() {
  // Create sales return
  ipcMain.handle('salesreturn:create', async (event, params) => {
    try {
      const result = SalesReturnService.createSalesReturn(params);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error creating sales return:', error);
      return { success: false, error: { message: error.message } };
    }
  });

  // List sales returns
  ipcMain.handle('salesreturn:list', async (event, params) => {
    try {
      const result = SalesReturnService.listSalesReturns(params);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error listing sales returns:', error);
      return { success: false, error: { message: error.message } };
    }
  });

  // Get sales return by ID
  ipcMain.handle('salesreturn:get', async (event, id) => {
    try {
      const result = SalesReturnService.getSalesReturn(id);
      if (!result) {
        return { success: false, error: { message: 'Sales return not found' } };
      }
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error getting sales return:', error);
      return { success: false, error: { message: error.message } };
    }
  });

  // Update refund status
  ipcMain.handle('salesreturn:updateRefund', async (event, params) => {
    try {
      const { id, refund_status, refund_date, refund_amount } = params;
      const result = SalesReturnService.updateRefundStatus(
        id,
        refund_status,
        refund_date,
        refund_amount
      );
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error updating refund status:', error);
      return { success: false, error: { message: error.message } };
    }
  });
}
