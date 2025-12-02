import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Search, Eye, DollarSign, Calendar, User, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  total_amount_ugx: number;
  payment_status: string;
  delivery_status: string;
  is_quotation: number;
  currency: string;
  amount_paid: number;
}

function SalesIndex() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [searchTerm, paymentFilter, deliveryFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const result = await window.api.sales.list({
        search: searchTerm || undefined,
        payment_status: paymentFilter || undefined,
        delivery_status: deliveryFilter || undefined,
        is_quotation: 0, // Only invoices, not quotations
        limit: 1000,
      });

      if (result.success) {
        setInvoices(result.data.invoices || []);
      } else {
        toast.error('Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
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

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total_amount_ugx, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalOutstanding = totalSales - totalPaid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoices...</p>
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
            <ShoppingCart className="w-8 h-8 text-primary" />
            Sales Invoices
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all sales transactions
          </p>
        </div>
        <button
          onClick={() => navigate('/sales/new')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Sale
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
        <div className="bg-card border border-primary rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-card border border-green-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-card border border-amber-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or customer..."
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Payment Status</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Delivery Status</option>
              <option value="Not Taken">Not Taken</option>
              <option value="Partially Taken">Partially Taken</option>
              <option value="Taken">Taken</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No invoices found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || paymentFilter || deliveryFilter
              ? 'Try adjusting your filters'
              : 'Create your first sales invoice to get started'}
          </p>
          {!searchTerm && !paymentFilter && !deliveryFilter && (
            <button
              onClick={() => navigate('/sales/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              New Sale
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold">Payment</th>
                  <th className="text-center py-3 px-4 font-semibold">Delivery</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{invoice.customer_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(invoice.invoice_date)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-semibold">{formatCurrency(invoice.total_amount_ugx)}</p>
                      {invoice.amount_paid < invoice.total_amount_ugx && (
                        <p className="text-xs text-amber-600">
                          Paid: {formatCurrency(invoice.amount_paid)}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          invoice.payment_status
                        )}`}
                      >
                        {invoice.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(
                          invoice.delivery_status
                        )}`}
                      >
                        {invoice.delivery_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/sales/${invoice.id}`)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="View invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Generating invoice...', { id: `print-${invoice.id}` });
                              const result = await window.api.printer.printInvoice(invoice.id);
                              if (result.success) {
                                toast.success('Invoice opened in PDF viewer', { id: `print-${invoice.id}` });
                              } else {
                                toast.error('Failed to generate invoice', { id: `print-${invoice.id}` });
                              }
                            } catch (error) {
                              toast.error('Failed to print invoice', { id: `print-${invoice.id}` });
                            }
                          }}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Print invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-muted/30 border-t border-border py-3 px-4">
            <p className="text-sm text-muted-foreground">
              Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesIndex;
