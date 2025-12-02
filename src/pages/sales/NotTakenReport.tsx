import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { PackageX, Phone, Calendar, DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import MarkAsTakenDialog from '@/components/forms/MarkAsTakenDialog';

interface NotTakenItem {
  invoice: any;
  days_pending: number;
  is_overdue: boolean;
  items_pending: any[];
  total_value_pending_ugx: number;
}

interface NotTakenReport {
  items: NotTakenItem[];
  summary: {
    total_invoices: number;
    total_items: number;
    total_value_ugx: number;
    oldest_pending_days: number;
    overdue_count: number;
  };
}

function NotTakenReport() {
  const [report, setReport] = useState<NotTakenReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<NotTakenItem | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await window.api.sales.getNotTakenReport({});
      if (result.success) {
        setReport(result.data);
      } else {
        toast.error('Failed to load Not Taken report');
      }
    } catch (error) {
      console.error('Error loading Not Taken report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleMarkAsTaken = (item: NotTakenItem) => {
    setSelectedInvoice(item);
  };

  const handleDialogClose = () => {
    setSelectedInvoice(null);
  };

  const handleDialogSuccess = () => {
    // Reload the report after successful delivery
    loadReport();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Not Taken report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PackageX className="w-8 h-8 text-primary" />
            Not Taken Report ⭐
          </h1>
          <p className="text-muted-foreground mt-1">
            Items sold but awaiting customer collection
          </p>
        </div>
        <button
          onClick={loadReport}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
          <p className="text-2xl font-bold">{report?.summary.total_invoices || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Items</p>
          <p className="text-2xl font-bold">{report?.summary.total_items || 0}</p>
        </div>

        <div className="bg-card border-2 border-primary rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Value</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(report?.summary.total_value_ugx || 0)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Oldest Pending</p>
          <p className="text-2xl font-bold">{report?.summary.oldest_pending_days || 0} days</p>
        </div>

        <div className="bg-card border border-amber-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Overdue</p>
          <p className="text-2xl font-bold text-amber-600">{report?.summary.overdue_count || 0}</p>
        </div>
      </div>

      {/* Invoices List */}
      {!report || report.items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">All clear!</h3>
          <p className="text-muted-foreground">
            No pending collections. All sold items have been delivered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {report.items.map((item) => (
            <div
              key={item.invoice.id}
              className={`bg-card border rounded-lg p-6 ${
                item.is_overdue ? 'border-amber-500' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                {/* Invoice Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {item.invoice.invoice_number}
                    </h3>
                    {item.is_overdue && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                        Overdue
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {item.invoice.delivery_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(item.invoice.invoice_date), 'MMM dd, yyyy')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.days_pending} days pending</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {item.invoice.customer_phone || 'No phone'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {formatCurrency(item.total_value_pending_ugx)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm">
                      <span className="font-medium">Customer:</span>{' '}
                      {item.invoice.customer_name}
                    </p>
                    {item.invoice.collection_notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Notes:</span> {item.invoice.collection_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleMarkAsTaken(item)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Mark as Taken
                </button>
              </div>

              {/* Pending Items */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm font-medium mb-2">Pending Items:</p>
                <div className="space-y-2">
                  {item.items_pending.map((pendingItem: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-muted/30 rounded p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{pendingItem.product_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Ordered: {pendingItem.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          Delivered: {pendingItem.quantity_delivered}
                        </span>
                        <span className="font-semibold text-primary">
                          Remaining: {pendingItem.quantity_remaining}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark as Taken Dialog */}
      {selectedInvoice && (
        <MarkAsTakenDialog
          invoice={selectedInvoice.invoice}
          items={selectedInvoice.items_pending}
          onClose={handleDialogClose}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}

export default NotTakenReport;
