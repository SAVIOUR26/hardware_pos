import { ipcMain, shell } from 'electron';
import * as salesService from '../services/sales.service';
import * as excelExportService from '../services/excel-export.service';

/**
 * Sales IPC Handlers
 * Exposes sales service methods to the renderer process
 */

export function registerSalesHandlers() {
  // Create sales invoice
  ipcMain.handle('sales:create', async (event, data) => {
    try {
      return salesService.createSalesInvoice(data);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_SALES_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get sales invoice by ID
  ipcMain.handle('sales:get', async (event, id) => {
    try {
      return salesService.getSalesInvoice(id);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_SALES_ERROR',
          message: error.message,
        },
      };
    }
  });

  // List sales invoices
  ipcMain.handle('sales:list', async (event, filters) => {
    try {
      return salesService.listSalesInvoices(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LIST_SALES_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get sales statistics
  ipcMain.handle('sales:getStats', async () => {
    try {
      return salesService.getSalesStats();
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SALES_STATS_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Get "Not Taken" report ⭐
  ipcMain.handle('sales:getNotTakenReport', async (event, filters) => {
    try {
      return salesService.getNotTakenReport(filters);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NOT_TAKEN_REPORT_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Convert quotation to invoice
  ipcMain.handle('sales:convertQuotation', async (event, quotationId) => {
    try {
      return salesService.convertQuotationToInvoice(quotationId);
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CONVERT_QUOTATION_ERROR',
          message: error.message,
        },
      };
    }
  });

  // Export sales vouchers to Excel (Tally Prime format)
  ipcMain.handle('sales:exportToExcel', async (event, filters) => {
    try {
      const result = await excelExportService.exportSalesVouchersToExcel(filters);

      // Open file location if successful
      if (result.success && result.filePath) {
        shell.showItemInFolder(result.filePath);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error.message,
        },
      };
    }
  });

  console.log('Sales IPC handlers registered');
}
