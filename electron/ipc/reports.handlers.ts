import { ipcMain } from 'electron';
import * as reportsService from '../services/reports.service';

/**
 * Register Reports IPC Handlers
 */
export function registerReportsHandlers() {
  // Get sales report
  ipcMain.handle('reports:getSalesReport', async (_event, filters: any) => {
    return reportsService.getSalesReport(filters);
  });

  // Get purchase report
  ipcMain.handle('reports:getPurchaseReport', async (_event, filters: any) => {
    return reportsService.getPurchaseReport(filters);
  });

  // Get cash book
  ipcMain.handle('reports:getCashBook', async (_event, currency: string, dateRange: any) => {
    return reportsService.getCashBook(currency, dateRange);
  });

  // Get profit & loss report
  ipcMain.handle('reports:getProfitLoss', async (_event, dateRange: any) => {
    return reportsService.getProfitLoss(dateRange);
  });

  console.log('Reports IPC handlers registered');
}
