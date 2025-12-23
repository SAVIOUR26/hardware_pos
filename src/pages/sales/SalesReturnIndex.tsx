import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Plus,
  Search,
  Eye,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SalesReturn {
  id: number;
  return_number: string;
  customer_name: string;
  invoice_number: string;
  return_date: string;
  total_amount_ugx: number;
  refund_status: string;
  refund_method: string;
  reason: string;
  currency: string;
  records_created?: number;
  records_updated?: number;
}

function SalesReturnIndex() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refundFilter, setRefundFilter] = useState('');

  useEffect(() => {
    loadReturns();
  }, [searchTerm, refundFilter]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const result = await window.api.salesReturn.list({
        search: searchTerm || undefined,
        refund_status: refundFilter || undefined,
        limit: 1000,
      });

      if (result.success) {
        setReturns(result.data.returns || []);
      } else {
        toast.error('Failed to load returns');
      }
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Failed to load returns');
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getRefundStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-amber-100 text-amber-800';
      case 'Credit Note':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Credit Note':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const totalReturns = returns.reduce((sum, ret) => sum + ret.total_amount_ugx, 0);
  const pendingReturns = returns.filter((r) => r.refund_status === 'Pending').length;
  const completedReturns = returns.filter((r) => r.refund_status === 'Completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-primary" />
            Sales Returns
          </h1>
          <p className="text-muted-foreground mt-1">Manage product returns and refunds</p>
        </div>
        <button
          onClick={() => navigate('/sales/returns/new')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Returns Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalReturns)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Refunds</p>
              <p className="text-2xl font-bold mt-1">{pendingReturns}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed Refunds</p>
              <p className="text-2xl font-bold mt-1">{completedReturns}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search return number, customer, invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Refund Status</label>
            <select
              value={refundFilter}
              onChange={(e) => setRefundFilter(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Credit Note">Credit Note</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setRefundFilter('');
              }}
              className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {returns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No sales returns found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || refundFilter
                ? 'Try adjusting your filters'
                : 'Create your first return to get started'}
            </p>
            <button
              onClick={() => navigate('/sales/returns/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Return
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">Return #</th>
                  <th className="text-left p-4 font-semibold">Invoice #</th>
                  <th className="text-left p-4 font-semibold">Customer</th>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Reason</th>
                  <th className="text-left p-4 font-semibold">Amount</th>
                  <th className="text-left p-4 font-semibold">Refund Status</th>
                  <th className="text-left p-4 font-semibold">Method</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((returnItem) => (
                  <tr
                    key={returnItem.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-sm font-medium">
                        {returnItem.return_number}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/sales/view/${returnItem.id}`)}
                        className="text-primary hover:underline font-mono text-sm"
                      >
                        {returnItem.invoice_number}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{returnItem.customer_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(returnItem.return_date)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{returnItem.reason}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">
                        {formatCurrency(returnItem.total_amount_ugx)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRefundStatusColor(
                          returnItem.refund_status
                        )}`}
                      >
                        {getRefundStatusIcon(returnItem.refund_status)}
                        {returnItem.refund_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {returnItem.refund_method || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/sales/returns/view/${returnItem.id}`)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {returns.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {returns.length} return{returns.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default SalesReturnIndex;
