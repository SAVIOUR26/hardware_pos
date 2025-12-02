import { ipcMain } from 'electron';
import * as settingsService from '../services/settings.service';

/**
 * Register Settings IPC Handlers
 */
export function registerSettingsHandlers() {
  // Create backup
  ipcMain.handle('settings:createBackup', async (_event, suggestedPath?: string) => {
    return settingsService.createBackup(suggestedPath);
  });

  // Restore backup
  ipcMain.handle('settings:restoreBackup', async (_event, backupPath: string) => {
    return settingsService.restoreBackup(backupPath);
  });

  // List backups
  ipcMain.handle('settings:listBackups', async () => {
    return settingsService.listBackups();
  });

  // Delete backup
  ipcMain.handle('settings:deleteBackup', async (_event, backupPath: string) => {
    return settingsService.deleteBackup(backupPath);
  });

  // Get database stats
  ipcMain.handle('settings:getDbStats', async () => {
    return settingsService.getDbStats();
  });

  // Optimize database
  ipcMain.handle('settings:optimizeDatabase', async () => {
    return settingsService.optimizeDatabase();
  });

  // Export database
  ipcMain.handle('settings:exportDatabase', async () => {
    return settingsService.exportDatabase();
  });

  // Import database
  ipcMain.handle('settings:importDatabase', async () => {
    return settingsService.importDatabase();
  });

  console.log('Settings IPC handlers registered');
}
