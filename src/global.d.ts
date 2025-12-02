// Global type definitions for Electron API

interface ElectronAPI {
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
  salesReturn: {
    create: (data: any) => Promise<any>;
    get: (id: number) => Promise<any>;
    list: (filters?: any) => Promise<any>;
    updateRefund: (params: any) => Promise<any>;
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
    importMasters: (filePath: string | null, options: any) => Promise<any>;
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
    printPurchaseInvoice: (invoiceId: number) => Promise<any>;
    printDeliveryNote: (deliveryNoteId: number, showPrices: boolean) => Promise<any>;
    getPrinters: () => Promise<any>;
  };
}

interface Window {
  api: ElectronAPI;
}
