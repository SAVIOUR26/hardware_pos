import { backupDatabase, vacuumDatabase, getDatabaseStats } from '../database';
import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

/**
 * Settings and Backup Service
 * Handle application settings, database backup, and restore operations
 */

/**
 * Create a database backup
 */
export async function createBackup(suggestedPath?: string): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    let backupPath: string;

    if (suggestedPath) {
      backupPath = suggestedPath;
    } else {
      // Default backup location
      const backupsDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const fileName = `hardware_manager_backup_${timestamp}.db`;
      backupPath = path.join(backupsDir, fileName);
    }

    await backupDatabase(backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      filePath: backupPath,
    };
  } catch (error: any) {
    console.error('Backup failed:', error);
    return {
      success: false,
      error: { code: 'BACKUP_FAILED', message: error.message },
    };
  }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(backupPath: string): Promise<{ success: boolean; error?: any }> {
  try {
    // Verify backup file exists
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: { code: 'BACKUP_NOT_FOUND', message: 'Backup file not found' },
      };
    }

    // Get current database path
    const dbPath = path.join(app.getPath('userData'), 'hardware_manager.db');

    // Create a backup of current database before restore
    const safetyBackupPath = path.join(
      app.getPath('userData'),
      `pre_restore_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.db`
    );

    // Copy current database as safety backup
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackupPath);
    }

    // Copy backup file to database location
    fs.copyFileSync(backupPath, dbPath);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return {
      success: false,
      error: { code: 'RESTORE_FAILED', message: error.message },
    };
  }
}

/**
 * List all available backups
 */
export function listBackups(): { success: boolean; backups?: any[]; error?: any } {
  try {
    const backupsDir = path.join(app.getPath('userData'), 'backups');

    if (!fs.existsSync(backupsDir)) {
      return { success: true, backups: [] };
    }

    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter((file) => file.endsWith('.db'))
      .map((file) => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          file_name: file,
          file_path: filePath,
          size_bytes: stats.size,
          size_mb: (stats.size / (1024 * 1024)).toFixed(2),
          created_at: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      success: true,
      backups,
    };
  } catch (error: any) {
    console.error('Failed to list backups:', error);
    return {
      success: false,
      error: { code: 'LIST_BACKUPS_FAILED', message: error.message },
    };
  }
}

/**
 * Delete a backup file
 */
export function deleteBackup(backupPath: string): { success: boolean; error?: any } {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: { code: 'BACKUP_NOT_FOUND', message: 'Backup file not found' },
      };
    }

    fs.unlinkSync(backupPath);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Failed to delete backup:', error);
    return {
      success: false,
      error: { code: 'DELETE_BACKUP_FAILED', message: error.message },
    };
  }
}

/**
 * Get database statistics
 */
export function getDbStats(): { success: boolean; stats?: any; error?: any } {
  try {
    const stats = getDatabaseStats();
    return {
      success: true,
      stats,
    };
  } catch (error: any) {
    console.error('Failed to get database stats:', error);
    return {
      success: false,
      error: { code: 'DB_STATS_FAILED', message: error.message },
    };
  }
}

/**
 * Optimize database (VACUUM)
 */
export function optimizeDatabase(): { success: boolean; error?: any } {
  try {
    vacuumDatabase();
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Failed to optimize database:', error);
    return {
      success: false,
      error: { code: 'OPTIMIZE_FAILED', message: error.message },
    };
  }
}

/**
 * Export database to a user-selected location
 */
export async function exportDatabase(): Promise<{ success: boolean; filePath?: string; error?: any }> {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Database',
      defaultPath: `hardware_manager_export_${format(new Date(), 'yyyy-MM-dd')}.db`,
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return {
        success: false,
        error: { code: 'EXPORT_CANCELED', message: 'Export canceled by user' },
      };
    }

    await backupDatabase(result.filePath);

    return {
      success: true,
      filePath: result.filePath,
    };
  } catch (error: any) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: { code: 'EXPORT_FAILED', message: error.message },
    };
  }
}

/**
 * Import database from a user-selected file
 */
export async function importDatabase(): Promise<{ success: boolean; error?: any }> {
  try {
    // Show open dialog
    const result = await dialog.showOpenDialog({
      title: 'Import Database',
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        error: { code: 'IMPORT_CANCELED', message: 'Import canceled by user' },
      };
    }

    const importPath = result.filePaths[0];

    // Restore from the selected file
    return await restoreBackup(importPath);
  } catch (error: any) {
    console.error('Import failed:', error);
    return {
      success: false,
      error: { code: 'IMPORT_FAILED', message: error.message },
    };
  }
}
