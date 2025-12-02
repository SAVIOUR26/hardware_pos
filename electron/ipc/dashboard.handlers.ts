import { ipcMain } from 'electron';
import * as dashboardService from '../services/dashboard.service';

/**
 * Register Dashboard IPC Handlers
 */
export function registerDashboardHandlers() {
  // Get dashboard stats
  ipcMain.handle('dashboard:getStats', async () => {
    return dashboardService.getDashboardStats();
  });

  console.log('Dashboard IPC handlers registered');
}
