import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ShoppingBag, DollarSign, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PurchaseInvoice {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_invoice_number: string | null;
  purchase_date: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_amount_ugx: number;
  payment_status: string;
  amount_paid: number;
  payment_method: string | null;
  created_at: string;
}

export default function PurchaseIndex() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [searchTerm, paymentFilter, purchases]);

  const loadPurchases = async () => {
    setLoading(true);
    const result = await window.api.purchase.list();
    if (result.success) {
      setPurchases(result.data.invoices);
    } else {
      toast.error('Failed to load purchases');
    }
    setLoading(false);
  };

  const filterPurchases = () => {
    let filtered = purchases;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (purchase) =>
          purchase.purchase_number.toLowerCase().includes(term) ||
          purchase.supplier_name.toLowerCase().includes(term) ||
          purchase.supplier_invoice_number?.toLowerCase().includes(term)
      );
    }

    // Payment status filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter((purchase) => purchase.payment_status === paymentFilter);
    }

    setFilteredPurchases(filtered);
  };

  // Calculate stats
  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount_ugx, 0);
  const totalPaid = purchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalOutstanding = totalPurchases - totalPaid;

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Unpaid':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground mt-1">View and manage purchase orders</p>
        </div>
        <button
          onClick={() => navigate('/purchases/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Purchase
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Purchases</p>
          <p className="text-2xl font-bold mt-1">{purchases.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold mt-1">
            UGX {totalPurchases.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            UGX {totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            UGX {totalOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by purchase number, supplier, or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading purchases...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {searchTerm || paymentFilter !== 'all'
                ? 'No purchases found matching your filters.'
                : 'No purchases yet. Create your first purchase to get started.'}
            </p>
            {!searchTerm && paymentFilter === 'all' && (
              <button
                onClick={() => navigate('/purchases/new')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Create First Purchase
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Purchase #</th>
                  <th className="text-left py-3 px-4 font-semibold">Supplier</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Supplier Invoice #</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold">Paid</th>
                  <th className="text-center py-3 px-4 font-semibold">Payment Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/purchases/${purchase.id}`)}
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium font-mono text-sm">
                        {purchase.purchase_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{purchase.supplier_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {purchase.supplier_invoice_number ? (
                        <span className="text-sm text-muted-foreground">
                          {purchase.supplier_invoice_number}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div>
                        <p className="font-medium">
                          {purchase.currency} {purchase.total_amount.toLocaleString()}
                        </p>
                        {purchase.currency === 'USD' && (
                          <p className="text-xs text-muted-foreground">
                            ≈ UGX {purchase.total_amount_ugx.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-green-600">
                        {purchase.currency} {purchase.amount_paid.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          purchase.payment_status
                        )}`}
                      >
                        {purchase.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {purchase.payment_method ? (
                        <span className="text-sm">{purchase.payment_method}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">-</span>
                      )}
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
