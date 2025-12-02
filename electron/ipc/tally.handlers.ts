/**
 * IPC Handlers for Tally Integration
 */

import { ipcMain, dialog } from 'electron';
import * as TallyService from '../services/tally.service';
import * as path from 'path';
import { app } from 'electron';

export function registerTallyHandlers() {
  // Import masters from XML file
  ipcMain.handle('tally:importMasters', async (event, filePath, options) => {
    try {
      // If no file path provided, show file dialog
      if (!filePath) {
        const result = await dialog.showOpenDialog({
          title: 'Select Tally XML File',
          filters: [{ name: 'XML Files', extensions: ['xml'] }],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: { message: 'No file selected' } };
        }

        filePath = result.filePaths[0];
      }

      const importResult = await TallyService.importMastersFromXML(filePath, options);

      return { success: true, data: importResult };
    } catch (error: any) {
      console.error('Error importing from Tally:', error);
      return { success: false, error: { message: error.message } };
    }
  });

  // Export vouchers to XML
  ipcMain.handle('tally:exportVouchers', async (event, dateRange, options) => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Vouchers to Tally XML',
        defaultPath: `tally_vouchers_${dateRange.from}_${dateRange.to}.xml`,
        filters: [{ name: 'XML Files', extensions: ['xml'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: { message: 'Export canceled' } };
      }

      const exportResult = await TallyService.exportVouchersToXML(
        dateRange,
        result.filePath,
        options
      );

      return { success: true, data: exportResult };
    } catch (error: any) {
      console.error('Error exporting to Tally:', error);
      return { success: false, error: { message: error.message } };
    }
  });

  // Get sync history
  ipcMain.handle('tally:getSyncHistory', async (event) => {
    try {
      const history = TallyService.getSyncHistory();
      return { success: true, data: history };
    } catch (error: any) {
      console.error('Error getting sync history:', error);
      return { success: false, error: { message: error.message } };
    }
  });
}
