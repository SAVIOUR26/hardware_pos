import { ipcMain, shell } from 'electron';
import * as printerService from '../services/printer.service';

/**
 * Register Printer IPC Handlers
 */
export function registerPrinterHandlers() {
  // Print invoice
  ipcMain.handle('printer:printInvoice', async (_event, invoiceId: number) => {
    const result = await printerService.generateInvoicePDF(invoiceId);

    if (result.success && result.filePath) {
      // Open PDF with default viewer
      shell.openPath(result.filePath);
    }

    return result;
  });

  // Print receipt
  ipcMain.handle('printer:printReceipt', async (_event, data: any, printerName?: string) => {
    const result = await printerService.generateReceiptPDF(data, printerName);

    if (result.success && result.filePath) {
      // Open PDF with default viewer
      shell.openPath(result.filePath);
    }

    return result;
  });

  // Print delivery note
  ipcMain.handle('printer:printDeliveryNote', async (_event, deliveryNoteId: number, showPrices: boolean = true) => {
    const result = await printerService.generateDeliveryNotePDF(deliveryNoteId, showPrices);

    if (result.success && result.filePath) {
      // Open PDF with default viewer
      shell.openPath(result.filePath);
    }

    return result;
  });

  // Get available printers
  ipcMain.handle('printer:getPrinters', async () => {
    return printerService.getAvailablePrinters();
  });

  console.log('Printer IPC handlers registered');
}
