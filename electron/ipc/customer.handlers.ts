import { ipcMain } from 'electron';
import * as customerService from '../services/customer.service';

/**
 * Register Customer IPC Handlers
 */
export function registerCustomerHandlers() {
  // Create customer
  ipcMain.handle('customer:create', async (event, data) => {
    return customerService.createCustomer(data);
  });

  // Get customer by ID
  ipcMain.handle('customer:get', async (event, id) => {
    return customerService.getCustomer(id);
  });

  // Get all customers (list)
  ipcMain.handle('customer:list', async (event, filters) => {
    return customerService.getAllCustomers(filters);
  });

  // Update customer
  ipcMain.handle('customer:update', async (event, id, data) => {
    return customerService.updateCustomer(id, data);
  });

  // Delete customer
  ipcMain.handle('customer:delete', async (event, id) => {
    return customerService.deleteCustomer(id);
  });

  // Search customers (for autocomplete)
  ipcMain.handle('customer:search', async (event, searchTerm, limit) => {
    return customerService.searchCustomers(searchTerm, limit);
  });
}
