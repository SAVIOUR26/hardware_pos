import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Printer,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

function ViewPurchase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPurchase();
    }
  }, [id]);

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const result = await window.api.purchase.get(parseInt(id!));
      if (result.success) {
        setPurchase(result.data);
      } else {
        toast.error('Purchase not found');
        navigate('/purchases');
      }
    } catch (error) {
      console.error('Error loading purchase:', error);
      toast.error('Failed to load purchase');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, curr?: string) => {
    const currency = curr || purchase?.currency || 'UGX';
    if (currency === 'UGX') {
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM dd, yyyy');
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading purchase...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Purchase not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              {purchase.purchase_number}
            </h1>
            <p className="text-muted-foreground mt-1">Purchase Invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              toast.loading('Generating purchase invoice PDF...', { id: 'print-purchase' });
              const result = await window.api.printer.printPurchaseInvoice(purchase.id);
              if (result.success) {
                toast.success('Opening purchase invoice PDF...', { id: 'print-purchase' });
              } else {
                toast.error('Failed to generate PDF: ' + (result.error?.message || 'Unknown error'), { id: 'print-purchase' });
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(
            purchase.payment_status
          )}`}
        >
          Payment: {purchase.payment_status}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {purchase.currency}
        </span>
      </div>

      {/* Purchase Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            Supplier Information
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Supplier Name</p>
              <p className="font-medium">{purchase.supplier_name}</p>
            </div>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Purchase Details
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Purchase Date</p>
              <p className="font-medium">{formatDate(purchase.purchase_date)}</p>
            </div>
            {purchase.supplier_invoice_number && (
              <div>
                <p className="text-sm text-muted-foreground">Supplier Invoice #</p>
                <p className="font-medium">{purchase.supplier_invoice_number}</p>
              </div>
            )}
            {purchase.currency === 'USD' && (
              <div>
                <p className="text-sm text-muted-foreground">Exchange Rate</p>
                <p className="font-medium">1 USD = {purchase.exchange_rate} UGX</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Items
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">#</th>
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-center py-3 px-4 font-semibold">Quantity</th>
                <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                <th className="text-right py-3 px-4 font-semibold">Tax</th>
                <th className="text-right py-3 px-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchase.items?.map((item: any, index: number) => (
                <tr key={item.id}>
                  <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{item.product_name}</p>
                  </td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(item.unit_price, purchase.currency)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.tax_percent > 0 ? `${item.tax_percent}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(item.line_total, purchase.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Totals */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            Totals
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(purchase.subtotal, purchase.currency)}
              </span>
            </div>
            {purchase.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {formatCurrency(purchase.tax_amount, purchase.currency)}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-bold">
                  {formatCurrency(purchase.total_amount, purchase.currency)}
                </span>
              </div>
              {purchase.currency === 'USD' && (
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-muted-foreground">In UGX</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(purchase.total_amount_ugx, 'UGX')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            Payment Information
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                  purchase.payment_status
                )}`}
              >
                {purchase.payment_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(purchase.amount_paid, purchase.currency)}
              </span>
            </div>
            {purchase.payment_status === 'Unpaid' && purchase.total_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    purchase.total_amount - purchase.amount_paid,
                    purchase.currency
                  )}
                </span>
              </div>
            )}
            {purchase.payment_method && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{purchase.payment_method}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            <span className="font-medium">{formatDate(purchase.created_at)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>{' '}
            <span className="font-medium">{formatDate(purchase.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewPurchase;
