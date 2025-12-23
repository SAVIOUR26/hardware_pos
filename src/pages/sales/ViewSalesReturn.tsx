import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SalesReturn {
  id: number;
  return_number: string;
  sales_invoice_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  invoice_number: string;
  invoice_date: string;
  return_date: string;
  reason: string;
  notes: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_amount_ugx: number;
  refund_status: string;
  refund_method: string;
  refund_date: string;
  refund_amount: number;
  created_at: string;
  items: ReturnItem[];
}

interface ReturnItem {
  id: number;
  product_name: string;
  quantity_returned: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  condition: string;
  restock: number;
  unit: string;
}

function ViewSalesReturn() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [returnData, setReturnData] = useState<SalesReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingRefund, setUpdatingRefund] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundStatus, setRefundStatus] = useState('');
  const [refundDate, setRefundDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refundAmount, setRefundAmount] = useState(0);

  useEffect(() => {
    loadReturn();
  }, [id]);

  const loadReturn = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const result = await window.api.salesReturn.get(parseInt(id, 10));

      if (result.success) {
        setReturnData(result.data);
        setRefundStatus(result.data.refund_status);
        setRefundAmount(result.data.total_amount);
      } else {
        toast.error('Return not found');
        navigate('/sales/returns');
      }
    } catch (error) {
      console.error('Error loading return:', error);
      toast.error('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRefund = async () => {
    if (!returnData) return;

    try {
      setUpdatingRefund(true);

      const result = await window.api.salesReturn.updateRefund({
        id: returnData.id,
        refund_status: refundStatus,
        refund_date: refundStatus === 'Completed' ? refundDate : undefined,
        refund_amount: refundStatus === 'Completed' ? refundAmount : 0,
      });

      if (result.success) {
        toast.success('Refund status updated successfully');
        setShowRefundDialog(false);
        loadReturn();
      } else {
        toast.error('Failed to update refund status');
      }
    } catch (error) {
      console.error('Error updating refund:', error);
      toast.error('Failed to update refund');
    } finally {
      setUpdatingRefund(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!returnData) return '';

    if (returnData.currency === 'UGX') {
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

  const getRefundStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Credit Note':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRefundStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'Pending':
        return <Clock className="w-5 h-5" />;
      case 'Credit Note':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Damaged':
        return 'bg-amber-100 text-amber-800';
      case 'Defective':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">Return not found</p>
        <button
          onClick={() => navigate('/sales/returns')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Back to Returns
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/sales/returns')}
            className="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Returns
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-primary" />
            {returnData.return_number}
          </h1>
          <p className="text-muted-foreground mt-1">Sales Return Details</p>
        </div>

        <div className="flex items-center gap-3">
          {returnData.refund_status === 'Pending' && (
            <button
              onClick={() => setShowRefundDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Refund
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border ${getRefundStatusColor(returnData.refund_status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRefundStatusIcon(returnData.refund_status)}
            <div>
              <p className="font-semibold">Refund Status: {returnData.refund_status}</p>
              {returnData.refund_date && (
                <p className="text-sm opacity-90">
                  Completed on {format(new Date(returnData.refund_date), 'PPP')}
                </p>
              )}
            </div>
          </div>
          {returnData.refund_status === 'Pending' && (
            <button
              onClick={() => setShowRefundDialog(true)}
              className="text-sm hover:underline flex items-center gap-1"
            >
              <Edit className="w-3 h-3" />
              Update Status
            </button>
          )}
        </div>
      </div>

      {/* Return & Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Return Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Return Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Return Number</p>
                <p className="font-mono font-semibold">{returnData.return_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Return Date</p>
                <p className="font-semibold">{format(new Date(returnData.return_date), 'PPP')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-semibold">{returnData.reason}</p>
              </div>
            </div>

            {returnData.notes && (
              <div className="flex items-start gap-3 pt-2 border-t border-border">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{returnData.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Invoice Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer & Invoice</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{returnData.customer_name}</p>
                {returnData.customer_phone && (
                  <p className="text-sm text-muted-foreground">{returnData.customer_phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Original Invoice</p>
                <button
                  onClick={() => navigate(`/sales/view/${returnData.sales_invoice_id}`)}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {returnData.invoice_number}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-semibold">{format(new Date(returnData.invoice_date), 'PPP')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Refund Method</p>
                <p className="font-semibold">{returnData.refund_method}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Return Items */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Returned Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-3 font-semibold">Product</th>
                <th className="text-left p-3 font-semibold">Quantity</th>
                <th className="text-left p-3 font-semibold">Unit Price</th>
                <th className="text-left p-3 font-semibold">Condition</th>
                <th className="text-left p-3 font-semibold">Restocked</th>
                <th className="text-right p-3 font-semibold">Refund Amount</th>
              </tr>
            </thead>
            <tbody>
              {returnData.items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.product_name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">
                      {item.quantity_returned} {item.unit}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(
                        item.condition
                      )}`}
                    >
                      {item.condition}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.restock === 1 ? (
                      <span className="flex items-center gap-1 text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-700 text-sm">
                        <XCircle className="w-4 h-4" />
                        No
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-semibold">{formatCurrency(item.line_total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
        <div className="space-y-2 max-w-md ml-auto">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatCurrency(returnData.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax:</span>
            <span>{formatCurrency(returnData.tax_amount)}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Refund Amount:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(returnData.total_amount)}
              </span>
            </div>
          </div>
          {returnData.refund_status === 'Completed' && returnData.refund_amount > 0 && (
            <div className="flex justify-between text-green-700 font-semibold pt-2 border-t border-border">
              <span>Refunded:</span>
              <span>{formatCurrency(returnData.refund_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Refund Update Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Refund Status</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Refund Status</label>
                <select
                  value={refundStatus}
                  onChange={(e) => setRefundStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Credit Note">Credit Note</option>
                </select>
              </div>

              {refundStatus === 'Completed' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Refund Date</label>
                    <input
                      type="date"
                      value={refundDate}
                      onChange={(e) => setRefundDate(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Refund Amount</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRefundDialog(false)}
                className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRefund}
                disabled={updatingRefund}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updatingRefund ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewSalesReturn;
