/**
 * Central IPC Handlers Registration
 * Import and register all IPC handlers here
 */

import { registerSalesHandlers } from './sales.handlers';
import { registerSalesReturnHandlers } from './salesreturn.handlers';
import { registerDeliveryHandlers } from './delivery.handlers';
import { registerInventoryHandlers } from './inventory.handlers';
import { registerPurchaseHandlers } from './purchase.handlers';
import { registerCustomerHandlers } from './customer.handlers';
import { registerSupplierHandlers } from './supplier.handlers';
import { registerDashboardHandlers } from './dashboard.handlers';
import { registerPrinterHandlers } from './printer.handlers';
import { registerReportsHandlers } from './reports.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerTallyHandlers } from './tally.handlers';

/**
 * Register all IPC handlers
 * Called from main process during app initialization
 */
export function registerAllHandlers() {
  console.log('Registering all IPC handlers...');

  registerSalesHandlers();
  registerSalesReturnHandlers();
  registerDeliveryHandlers();
  registerInventoryHandlers();
  registerPurchaseHandlers();
  registerCustomerHandlers();
  registerSupplierHandlers();
  registerDashboardHandlers();
  registerPrinterHandlers();
  registerReportsHandlers();
  registerSettingsHandlers();
  registerTallyHandlers();

  // Additional handlers will be registered here:
  // registerPaymentHandlers();

  console.log('All IPC handlers registered successfully');
}
