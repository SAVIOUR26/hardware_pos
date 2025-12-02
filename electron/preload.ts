import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Test method to verify IPC is working
  test: () => {
    return 'IPC is working!';
  },

  // Database API (to be implemented)
  database: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  },

  // Sales API (to be implemented)
  sales: {
    create: (data: any) => ipcRenderer.invoke('sales:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('sales:update', id, data),
    get: (id: number) => ipcRenderer.invoke('sales:get', id),
    list: (filters?: any) => ipcRenderer.invoke('sales:list', filters),
    getStats: () => ipcRenderer.invoke('sales:getStats'),
    markAsTaken: (invoiceId: number, items: any[]) => ipcRenderer.invoke('sales:markAsTaken', invoiceId, items),
    getNotTakenReport: (filters?: any) => ipcRenderer.invoke('sales:getNotTakenReport', filters),
  },

  // Sales Return API
  salesReturn: {
    create: (data: any) => ipcRenderer.invoke('salesreturn:create', data),
    get: (id: number) => ipcRenderer.invoke('salesreturn:get', id),
    list: (filters?: any) => ipcRenderer.invoke('salesreturn:list', filters),
    updateRefund: (params: any) => ipcRenderer.invoke('salesreturn:updateRefund', params),
  },

  // Purchase API (to be implemented)
  purchase: {
    create: (data: any) => ipcRenderer.invoke('purchase:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('purchase:update', id, data),
    get: (id: number) => ipcRenderer.invoke('purchase:get', id),
    list: (filters?: any) => ipcRenderer.invoke('purchase:list', filters),
  },

  // Inventory API (to be implemented)
  inventory: {
    createProduct: (data: any) => ipcRenderer.invoke('inventory:createProduct', data),
    updateProduct: (id: number, data: any) => ipcRenderer.invoke('inventory:updateProduct', id, data),
    getProduct: (id: number) => ipcRenderer.invoke('inventory:getProduct', id),
    listProducts: (filters?: any) => ipcRenderer.invoke('inventory:listProducts', filters),
    adjustStock: (productId: number, quantity: number, reason: string) =>
      ipcRenderer.invoke('inventory:adjustStock', productId, quantity, reason),
  },

  // Customer API
  customer: {
    create: (data: any) => ipcRenderer.invoke('customer:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('customer:update', id, data),
    get: (id: number) => ipcRenderer.invoke('customer:get', id),
    list: (filters?: any) => ipcRenderer.invoke('customer:list', filters),
    search: (searchTerm: string, limit?: number) => ipcRenderer.invoke('customer:search', searchTerm, limit),
    delete: (id: number) => ipcRenderer.invoke('customer:delete', id),
    getLedger: (id: number, dateRange?: any) => ipcRenderer.invoke('customer:getLedger', id, dateRange),
    getBalance: (id: number) => ipcRenderer.invoke('customer:getBalance', id),
  },

  // Delivery API
  delivery: {
    markAsTaken: (request: any) => ipcRenderer.invoke('delivery:markAsTaken', request),
    get: (id: number) => ipcRenderer.invoke('delivery:get', id),
    list: (filters?: any) => ipcRenderer.invoke('delivery:list', filters),
  },

  // Dashboard API
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
  },

  // Supplier API
  supplier: {
    create: (data: any) => ipcRenderer.invoke('supplier:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('supplier:update', id, data),
    get: (id: number) => ipcRenderer.invoke('supplier:get', id),
    list: (filters?: any) => ipcRenderer.invoke('supplier:list', filters),
    search: (searchTerm: string, limit?: number) => ipcRenderer.invoke('supplier:search', searchTerm, limit),
    delete: (id: number) => ipcRenderer.invoke('supplier:delete', id),
    getLedger: (id: number, dateRange?: any) => ipcRenderer.invoke('supplier:getLedger', id, dateRange),
  },

  // Tally API (to be implemented)
  tally: {
    importMasters: (filePath: string, options: any) => ipcRenderer.invoke('tally:importMasters', filePath, options),
    exportVouchers: (dateRange: any, options: any) => ipcRenderer.invoke('tally:exportVouchers', dateRange, options),
    getSyncHistory: () => ipcRenderer.invoke('tally:getSyncHistory'),
  },

  // Reports API (to be implemented)
  reports: {
    getSalesReport: (filters: any) => ipcRenderer.invoke('reports:getSalesReport', filters),
    getPurchaseReport: (filters: any) => ipcRenderer.invoke('reports:getPurchaseReport', filters),
    getCashBook: (currency: string, dateRange: any) => ipcRenderer.invoke('reports:getCashBook', currency, dateRange),
    getProfitLoss: (dateRange: any) => ipcRenderer.invoke('reports:getProfitLoss', dateRange),
    exportToExcel: (reportData: any, filename: string) =>
      ipcRenderer.invoke('reports:exportToExcel', reportData, filename),
    exportToPDF: (reportData: any, filename: string) =>
      ipcRenderer.invoke('reports:exportToPDF', reportData, filename),
  },

  // Settings API
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', key),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    createBackup: (suggestedPath?: string) => ipcRenderer.invoke('settings:createBackup', suggestedPath),
    restoreBackup: (backupPath: string) => ipcRenderer.invoke('settings:restoreBackup', backupPath),
    listBackups: () => ipcRenderer.invoke('settings:listBackups'),
    deleteBackup: (backupPath: string) => ipcRenderer.invoke('settings:deleteBackup', backupPath),
    getDbStats: () => ipcRenderer.invoke('settings:getDbStats'),
    optimizeDatabase: () => ipcRenderer.invoke('settings:optimizeDatabase'),
    exportDatabase: () => ipcRenderer.invoke('settings:exportDatabase'),
    importDatabase: () => ipcRenderer.invoke('settings:importDatabase'),
  },

  // Printer API (to be implemented)
  printer: {
    printReceipt: (data: any, printerName?: string) => ipcRenderer.invoke('printer:printReceipt', data, printerName),
    printInvoice: (invoiceId: number) => ipcRenderer.invoke('printer:printInvoice', invoiceId),
    printDeliveryNote: (deliveryNoteId: number, showPrices: boolean) =>
      ipcRenderer.invoke('printer:printDeliveryNote', deliveryNoteId, showPrices),
    getPrinters: () => ipcRenderer.invoke('printer:getPrinters'),
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  test: () => string;
  database: {
    query: (sql: string, params?: any[]) => Promise<any>;
  };
  sales: {
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
    getStats: () => Promise<any>;
    markAsTaken: (invoiceId: number, items: any[]) => Promise<any>;
    getNotTakenReport: (filters?: any) => Promise<any>;
  };
  purchase: {
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
  };
  inventory: {
    createProduct: (data: any) => Promise<any>;
    updateProduct: (id: number, data: any) => Promise<any>;
    getProduct: (id: number) => Promise<any>;
    listProducts: (filters?: any) => Promise<any>;
    adjustStock: (productId: number, quantity: number, reason: string) => Promise<any>;
  };
  customer: {
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
    search: (searchTerm: string, limit?: number) => Promise<any>;
    delete: (id: number) => Promise<any>;
    getLedger: (id: number, dateRange?: any) => Promise<any>;
    getBalance: (id: number) => Promise<any>;
  };
  delivery: {
    markAsTaken: (request: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
  };
  dashboard: {
    getStats: () => Promise<any>;
  };
  supplier: {
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
    search: (searchTerm: string, limit?: number) => Promise<any>;
    delete: (id: number) => Promise<any>;
    getLedger: (id: number, dateRange?: any) => Promise<any>;
  };
  tally: {
    importMasters: (filePath: string, options: any) => Promise<any>;
    exportVouchers: (dateRange: any, options: any) => Promise<any>;
    getSyncHistory: () => Promise<any>;
  };
  reports: {
    getSalesReport: (filters: any) => Promise<any>;
    getPurchaseReport: (filters: any) => Promise<any>;
    getCashBook: (currency: string, dateRange: any) => Promise<any>;
    getProfitLoss: (dateRange: any) => Promise<any>;
    exportToExcel: (reportData: any, filename: string) => Promise<any>;
    exportToPDF: (reportData: any, filename: string) => Promise<any>;
  };
  settings: {
    get: (key?: string) => Promise<any>;
    update: (settings: any) => Promise<any>;
    createBackup: (suggestedPath?: string) => Promise<any>;
    restoreBackup: (backupPath: string) => Promise<any>;
    listBackups: () => Promise<any>;
    deleteBackup: (backupPath: string) => Promise<any>;
    getDbStats: () => Promise<any>;
    optimizeDatabase: () => Promise<any>;
    exportDatabase: () => Promise<any>;
    importDatabase: () => Promise<any>;
  };
  printer: {
    printReceipt: (data: any, printerName?: string) => Promise<any>;
    printInvoice: (invoiceId: number) => Promise<any>;
    printDeliveryNote: (deliveryNoteId: number, showPrices: boolean) => Promise<any>;
    getPrinters: () => Promise<any>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
