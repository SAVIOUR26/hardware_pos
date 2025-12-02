import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Download, Upload, Trash2, RefreshCw, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function Settings() {
  const [backups, setBackups] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackups();
    loadDbStats();
  }, []);

  const loadBackups = async () => {
    try {
      const result = await window.api.settings.listBackups();
      if (result.success) {
        setBackups(result.backups || []);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadDbStats = async () => {
    try {
      const result = await window.api.settings.getDbStats();
      if (result.success) {
        setDbStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      toast.loading('Creating backup...', { id: 'backup' });
      const result = await window.api.settings.createBackup();

      if (result.success) {
        toast.success('Backup created successfully!', { id: 'backup' });
        await loadBackups();
      } else {
        toast.error('Failed to create backup', { id: 'backup' });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup', { id: 'backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      setLoading(true);
      toast.loading('Exporting database...', { id: 'export' });
      const result = await window.api.settings.exportDatabase();

      if (result.success) {
        toast.success('Database exported successfully!', { id: 'export' });
      } else if (result.error?.code !== 'EXPORT_CANCELED') {
        toast.error('Failed to export database', { id: 'export' });
      } else {
        toast.dismiss('export');
      }
    } catch (error) {
      console.error('Error exporting database:', error);
      toast.error('Failed to export database', { id: 'export' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportDatabase = async () => {
    if (!confirm('WARNING: This will replace your current database. Make sure you have a backup first. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      toast.loading('Importing database...', { id: 'import' });
      const result = await window.api.settings.importDatabase();

      if (result.success) {
        toast.success('Database imported successfully! Please restart the application.', { id: 'import' });
      } else if (result.error?.code !== 'IMPORT_CANCELED') {
        toast.error('Failed to import database', { id: 'import' });
      } else {
        toast.dismiss('import');
      }
    } catch (error) {
      console.error('Error importing database:', error);
      toast.error('Failed to import database', { id: 'import' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!confirm('WARNING: This will restore the database from this backup. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      toast.loading('Restoring backup...', { id: 'restore' });
      const result = await window.api.settings.restoreBackup(backupPath);

      if (result.success) {
        toast.success('Backup restored successfully! Please restart the application.', { id: 'restore' });
      } else {
        toast.error('Failed to restore backup', { id: 'restore' });
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup', { id: 'restore' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupPath: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    try {
      const result = await window.api.settings.deleteBackup(backupPath);

      if (result.success) {
        toast.success('Backup deleted successfully');
        await loadBackups();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Failed to delete backup');
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setLoading(true);
      toast.loading('Optimizing database...', { id: 'optimize' });
      const result = await window.api.settings.optimizeDatabase();

      if (result.success) {
        toast.success('Database optimized successfully!', { id: 'optimize' });
        await loadDbStats();
      } else {
        toast.error('Failed to optimize database', { id: 'optimize' });
      }
    } catch (error) {
      console.error('Error optimizing database:', error);
      toast.error('Failed to optimize database', { id: 'optimize' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings & Backup
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage database backups and application settings
        </p>
      </div>

      {/* Database Statistics */}
      {dbStats && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              Database Statistics
            </h2>
            <button
              onClick={handleOptimizeDatabase}
              disabled={loading}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Optimize
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Products</p>
              <p className="text-2xl font-bold">{dbStats.products?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Customers</p>
              <p className="text-2xl font-bold">{dbStats.customers?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Sales</p>
              <p className="text-2xl font-bold">{dbStats.sales_invoices?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Purchases</p>
              <p className="text-2xl font-bold">{dbStats.purchase_invoices?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Suppliers</p>
              <p className="text-2xl font-bold">{dbStats.suppliers?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Payments</p>
              <p className="text-2xl font-bold">{dbStats.payments?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Database Size</p>
              <p className="text-2xl font-bold">{dbStats.database_size_mb} MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Backup Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          Database Backup
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="px-4 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Database className="w-5 h-5" />
            Create Backup
          </button>

          <button
            onClick={handleExportDatabase}
            disabled={loading}
            className="px-4 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Database
          </button>

          <button
            onClick={handleImportDatabase}
            disabled={loading}
            className="px-4 py-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Import Database
          </button>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Tip:</strong> Create regular backups to prevent data loss. Export allows you to save to any location, while Create Backup saves to the default backup folder.
          </p>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Backup History</h2>
          <button
            onClick={loadBackups}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Refresh backups"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No backups found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first backup to protect your data
            </p>
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Backup
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">File Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Created</th>
                  <th className="text-right py-3 px-4 font-semibold">Size</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{backup.file_name}</td>
                    <td className="py-3 px-4">{formatDate(backup.created_at)}</td>
                    <td className="py-3 px-4 text-right">{backup.size_mb} MB</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleRestoreBackup(backup.file_path)}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.file_path)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Delete backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
