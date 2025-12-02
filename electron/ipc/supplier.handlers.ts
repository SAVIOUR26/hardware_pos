import { ipcMain } from 'electron';
import * as supplierService from '../services/supplier.service';

/**
 * Register Supplier IPC Handlers
 */
export function registerSupplierHandlers() {
  // Create supplier
  ipcMain.handle('supplier:create', async (event, data) => {
    return supplierService.createSupplier(data);
  });

  // Get supplier by ID
  ipcMain.handle('supplier:get', async (event, id) => {
    return supplierService.getSupplier(id);
  });

  // Get all suppliers (list)
  ipcMain.handle('supplier:list', async (event, filters) => {
    return supplierService.getAllSuppliers(filters);
  });

  // Update supplier
  ipcMain.handle('supplier:update', async (event, id, data) => {
    return supplierService.updateSupplier(id, data);
  });

  // Delete supplier
  ipcMain.handle('supplier:delete', async (event, id) => {
    return supplierService.deleteSupplier(id);
  });

  // Search suppliers (for autocomplete)
  ipcMain.handle('supplier:search', async (event, searchTerm, limit) => {
    return supplierService.searchSuppliers(searchTerm, limit);
  });

  console.log('Supplier IPC handlers registered');
}
