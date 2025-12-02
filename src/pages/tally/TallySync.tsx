import { useState } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TallySync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);

  const handleExportToTally = async () => {
    setSyncing(true);
    try {
      toast.loading('Exporting data to Tally...', { id: 'export-tally' });
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Data exported to Tally successfully!', { id: 'export-tally' });
      setLastSyncDate(new Date());
    } catch (error) {
      toast.error('Failed to export to Tally', { id: 'export-tally' });
    } finally {
      setSyncing(false);
    }
  };

  const handleImportFromTally = async () => {
    setSyncing(true);
    try {
      toast.loading('Importing data from Tally...', { id: 'import-tally' });
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Data imported from Tally successfully!', { id: 'import-tally' });
      setLastSyncDate(new Date());
    } catch (error) {
      toast.error('Failed to import from Tally', { id: 'import-tally' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncBoth = async () => {
    setSyncing(true);
    try {
      toast.loading('Synchronizing with Tally...', { id: 'sync-tally' });
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Synchronization completed successfully!', { id: 'sync-tally' });
      setLastSyncDate(new Date());
    } catch (error) {
      toast.error('Synchronization failed', { id: 'sync-tally' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Tally Sync
        </h1>
        <p className="text-muted-foreground mt-1">
          Synchronize data between Hardware Manager Pro and Tally ERP
        </p>
      </div>

      {/* Sync Status Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Sync Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Connection Status</span>
            </div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Last Sync</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {lastSyncDate ? lastSyncDate.toLocaleString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Synchronization Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleExportToTally}
            disabled={syncing}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload className="w-8 h-8" />
            <div className="text-center">
              <p className="font-semibold">Export to Tally</p>
              <p className="text-xs opacity-90 mt-1">Send data to Tally ERP</p>
            </div>
          </button>

          <button
            onClick={handleImportFromTally}
            disabled={syncing}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download className="w-8 h-8" />
            <div className="text-center">
              <p className="font-semibold">Import from Tally</p>
              <p className="text-xs opacity-90 mt-1">Fetch data from Tally ERP</p>
            </div>
          </button>

          <button
            onClick={handleSyncBoth}
            disabled={syncing}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-8 h-8 ${syncing ? 'animate-spin' : ''}`} />
            <div className="text-center">
              <p className="font-semibold">Two-Way Sync</p>
              <p className="text-xs opacity-90 mt-1">Sync both ways</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sync Configuration */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tally Server URL</label>
            <input
              type="text"
              placeholder="http://localhost:9000"
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue="http://localhost:9000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              placeholder="Enter Tally company name"
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue="Stuti Hardware SMC Limited"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-sync"
              className="w-4 h-4 rounded border-input"
              defaultChecked
            />
            <label htmlFor="auto-sync" className="text-sm">
              Enable automatic synchronization every hour
            </label>
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            Save Configuration
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Coming Soon - Full Integration</p>
          <p>
            Tally synchronization functionality is currently under development.
            The full integration will support real-time data sync between Hardware Manager Pro and Tally ERP 9.
          </p>
        </div>
      </div>
    </div>
  );
}
