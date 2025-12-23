import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Package,
  Printer,
  PackageX,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

function ViewSale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const result = await window.api.sales.get(parseInt(id!));
      if (result.success) {
        setInvoice(result.data);
      } else {
        toast.error('Invoice not found');
        navigate('/sales');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, curr?: string) => {
    const currency = curr || invoice?.currency || 'UGX';
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
      case 'Partial':
        return 'bg-amber-100 text-amber-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'Taken':
        return 'bg-green-100 text-green-800';
      case 'Partially Taken':
        return 'bg-blue-100 text-blue-800';
      case 'Not Taken':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </div>
    );
  }

  const hasNotTakenItems = invoice.delivery_status !== 'Taken';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sales')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {invoice.is_quotation ? 'Quotation' : 'Sales Invoice'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasNotTakenItems && (
            <button
              onClick={() => navigate('/sales/not-taken')}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <PackageX className="w-4 h-4" />
              Mark as Taken
            </button>
          )}
          <button
            onClick={() => navigate(`/sales/returns/new?invoice_id=${invoice.id}`)}
            className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            title="Process a return for this invoice"
          >
            <RotateCcw className="w-4 h-4" />
            Process Return
          </button>
          <button
            onClick={async () => {
              try {
                toast.loading('Generating thermal receipt...', { id: 'print-thermal' });
                const result = await window.api.printer.printThermalReceipt(invoice.id);
                if (result.success) {
                  toast.success('Thermal receipt opened', { id: 'print-thermal' });
                } else {
                  toast.error('Failed to generate receipt', { id: 'print-thermal' });
                }
              } catch (error) {
                toast.error('Failed to print thermal receipt', { id: 'print-thermal' });
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Thermal (3")
          </button>
          <button
            onClick={async () => {
              try {
                toast.loading('Generating invoice...', { id: 'print-invoice' });
                const result = await window.api.printer.printInvoice(invoice.id);
                if (result.success) {
                  toast.success('Invoice opened in PDF viewer', { id: 'print-invoice' });
                } else {
                  toast.error('Failed to generate invoice', { id: 'print-invoice' });
                }
              } catch (error) {
                toast.error('Failed to print invoice', { id: 'print-invoice' });
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print A4
          </button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(
            invoice.payment_status
          )}`}
        >
          Payment: {invoice.payment_status}
        </span>
        {!invoice.is_quotation && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getDeliveryStatusColor(
              invoice.delivery_status
            )}`}
          >
            Delivery: {invoice.delivery_status}
          </span>
        )}
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {invoice.currency}
        </span>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            Customer Information
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{invoice.customer_name}</p>
            </div>
            {invoice.customer_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{invoice.customer_phone}</p>
              </div>
            )}
            {invoice.customer_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invoice.customer_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Invoice Details
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
            </div>
            {invoice.expected_collection_date && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Collection</p>
                <p className="font-medium">{formatDate(invoice.expected_collection_date)}</p>
              </div>
            )}
            {invoice.collection_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Collection Notes</p>
                <p className="font-medium">{invoice.collection_notes}</p>
              </div>
            )}
            {invoice.payment_method && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{invoice.payment_method}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Items
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-center py-3 px-4 font-semibold">Qty</th>
                <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                <th className="text-right py-3 px-4 font-semibold">Discount</th>
                <th className="text-right py-3 px-4 font-semibold">Tax</th>
                <th className="text-right py-3 px-4 font-semibold">Subtotal</th>
                {!invoice.is_quotation && (
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                )}
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-border">
                  <td className="py-3 px-4">
                    <p className="font-medium">{item.product_name}</p>
                  </td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.tax_percent > 0 ? `${item.tax_percent}%` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(item.line_total)}
                  </td>
                  {!invoice.is_quotation && (
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(
                          item.delivery_status
                        )}`}
                      >
                        {item.delivery_status}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-6 border-t border-border bg-muted/30">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(invoice.discount_amount)}
                </span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-lg">Total:</span>
              <span className="font-bold text-lg text-primary">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            {invoice.currency === 'USD' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  (UGX @ {invoice.exchange_rate}):
                </span>
                <span className="font-medium">
                  {formatCurrency(invoice.total_amount_ugx, 'UGX')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {!invoice.is_quotation && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            Payment Information
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(invoice.amount_paid)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(invoice.total_amount - invoice.amount_paid)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewSale;
