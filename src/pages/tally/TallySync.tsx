import { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SyncHistoryItem {
  id: number;
  sync_type: string;
  sync_date: string;
  file_path: string;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  errors_count: number;
  error_log: string[];
  summary: any;
}

export default function TallySync() {
  const [syncing, setSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<SyncHistoryItem | null>(null);

  // Load sync history on mount
  useEffect(() => {
    loadSyncHistory();
  }, []);

  const loadSyncHistory = async () => {
    try {
      const result = await window.api.tally.getSyncHistory();
      if (result.success) {
        setSyncHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  };

  const handleImportMasters = async () => {
    setSyncing(true);
    try {
      // Step 1: File selection
      toast.loading('📁 Opening file selector...', { id: 'import-tally' });

      // Step 2: Reading file
      setTimeout(() => {
        toast.loading('📖 Reading Tally XML file...', { id: 'import-tally' });
      }, 300);

      const result = await window.api.tally.importMasters(null, {
        importCurrencies: true,
        importUnits: true,
        importLedgers: true,
        importProducts: true,
      });

      if (result.success) {
        const data = result.data;

        if (data.status === 'Success') {
          // Success with detailed breakdown
          const summary = [
            `✅ Import Completed Successfully!`,
            ``,
            `📊 Summary:`,
            `  • Total Processed: ${data.records_processed || 0} records`,
            `  • Created: ${data.records_created} new records`,
            `  • Updated: ${data.records_updated} existing records`,
            ``,
            `📦 Breakdown:`,
            `  • Customers: ${data.summary.customers || 0}`,
            `  • Suppliers: ${data.summary.suppliers || 0}`,
            `  • Products: ${data.summary.products || 0}`,
            `  • Currencies: ${data.summary.currencies || 0}`,
            `  • Units: ${data.summary.units || 0}`,
          ].join('\n');

          toast.success(summary, { id: 'import-tally', duration: 8000 });
        } else if (data.status === 'Partial') {
          toast.warning(
            `⚠️ Import Completed with Errors\n\nCreated: ${data.records_created} | Updated: ${data.records_updated}\nErrors: ${data.errors_count}\n\nCheck sync history for details.`,
            { id: 'import-tally', duration: 7000 }
          );
        } else {
          toast.error(`❌ Import Failed\n\n${data.errors[0] || 'Unknown error'}`, {
            id: 'import-tally',
            duration: 6000,
          });
        }

        // Reload history
        await loadSyncHistory();
      } else {
        toast.error(`❌ Import Failed\n\n${result.error?.message || 'Unknown error'}`, {
          id: 'import-tally',
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast.error(`❌ Import Error\n\n${error.message}`, {
        id: 'import-tally',
        duration: 5000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportVouchers = async () => {
    setSyncing(true);
    try {
      // Step 1: Preparing
      toast.loading('📤 Preparing voucher export...', { id: 'export-tally' });

      // Get current month date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Step 2: Processing
      setTimeout(() => {
        toast.loading('🔄 Processing sales and purchase vouchers...', { id: 'export-tally' });
      }, 300);

      const result = await window.api.tally.exportVouchers(
        {
          from: format(firstDay, 'yyyy-MM-dd'),
          to: format(lastDay, 'yyyy-MM-dd'),
        },
        {
          exportSales: true,
          exportPurchases: true,
        }
      );

      if (result.success && result.data.success) {
        const exportMsg = [
          `✅ Vouchers Exported Successfully!`,
          ``,
          `📁 File saved to:`,
          `${result.data.filePath}`,
          ``,
          `📅 Period: ${format(firstDay, 'MMM dd')} - ${format(lastDay, 'MMM dd, yyyy')}`,
          ``,
          `You can now import this file into Tally Prime.`,
        ].join('\n');

        toast.success(exportMsg, {
          id: 'export-tally',
          duration: 8000,
        });

        // Reload history
        await loadSyncHistory();
      } else {
        toast.error(`❌ Export Failed\n\n${result.data?.error || 'Unknown error'}`, {
          id: 'export-tally',
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast.error(`❌ Export Error\n\n${error.message}`, {
        id: 'export-tally',
        duration: 5000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Partial':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'Failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'text-green-600 bg-green-50';
      case 'Partial':
        return 'text-amber-600 bg-amber-50';
      case 'Failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Tally Prime Integration
        </h1>
        <p className="text-muted-foreground mt-1">
          Import masters from Tally and export vouchers for seamless accounting integration
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Masters Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Import Masters from Tally</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Import customers, suppliers, and products from Tally XML export file
              </p>
              <button
                onClick={handleImportMasters}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Select XML File & Import
              </button>
            </div>
          </div>
        </div>

        {/* Export Vouchers Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Export Vouchers to Tally</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Export sales and purchase invoices as Tally-compatible XML vouchers
              </p>
              <button
                onClick={handleExportVouchers}
                disabled={syncing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Export This Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          How to Use Tally Integration
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-blue-900">📥 Importing from Tally:</strong>
            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-gray-700">
              <li>In Tally Prime, go to Gateway of Tally → Display → Reports → All Masters</li>
              <li>Press Alt+E to export, select XML format, and save the file</li>
              <li>Click "Select XML File & Import" above and choose your exported file</li>
              <li>Masters will be imported with Tally IDs for future sync</li>
            </ol>
          </div>

          <div>
            <strong className="text-blue-900">📤 Exporting to Tally:</strong>
            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-gray-700">
              <li>Click "Export This Month" to generate Tally-compatible XML</li>
              <li>Save the XML file to your desired location</li>
              <li>In Tally Prime, go to Gateway of Tally → Import → Vouchers</li>
              <li>Select the XML file and import your transactions</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sync History</h2>
          <button
            onClick={loadSyncHistory}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {syncHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No sync history yet. Start by importing or exporting data.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {syncHistory.map((item) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedHistory(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.sync_type}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.sync_date), 'PPpp')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {item.records_created} created
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {item.records_updated} updated
                        </span>
                        {item.errors_count > 0 && (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {item.errors_count} errors
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      {item.summary && Object.keys(item.summary).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <strong>Imported:</strong>{' '}
                          {Object.entries(item.summary)
                            .map(([key, value]) => `${value} ${key}`)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedHistory?.id === item.id && item.errors_count > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">Errors:</h4>
                    <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                      {item.error_log.slice(0, 10).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                      {item.error_log.length > 10 && (
                        <li className="text-red-600 font-medium">
                          ... and {item.error_log.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
