import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  PackageX,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Package,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  sales: {
    today: number;
    today_count: number;
    month: number;
    month_count: number;
  };
  purchases: {
    today: number;
    month: number;
    month_count: number;
  };
  notTaken: {
    value: number;
    count: number;
    oldest_days: number;
  };
  financials: {
    receivables: number;
    payables: number;
  };
  inventory: {
    low_stock_count: number;
    out_of_stock_count: number;
    total_value: number;
  };
  recent: {
    sales: any[];
    purchases: any[];
  };
  top: {
    products: any[];
    customers: any[];
  };
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await window.api.dashboard.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Partial':
        return 'bg-amber-100 text-amber-700';
      case 'Unpaid':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'Taken':
        return 'bg-green-100 text-green-700';
      case 'Partially Taken':
        return 'bg-blue-100 text-blue-700';
      case 'Not Taken':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your hardware shop today.
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <Link
          to="/sales"
          className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="text-sm text-green-700 mb-1">Today's Sales</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(stats?.sales.today || 0)}
            </p>
            <p className="text-xs text-green-600 mt-2">
              {stats?.sales.today_count || 0} invoices
            </p>
          </div>
        </Link>

        {/* Pending Collections (Not Taken) ⭐ */}
        <Link
          to="/sales/not-taken"
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <PackageX className="w-6 h-6 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="text-sm text-blue-700 mb-1 font-semibold">
              Pending Collections ⭐
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(stats?.notTaken.value || 0)}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              {stats?.notTaken.count || 0} orders awaiting collection
            </p>
          </div>
        </Link>

        {/* Low Stock Alert */}
        <Link
          to="/inventory"
          className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-500 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="text-sm text-amber-700 mb-1">Low Stock Items</p>
            <p className="text-2xl font-bold text-amber-900">
              {stats?.inventory.low_stock_count || 0}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              {stats?.inventory.out_of_stock_count || 0} out of stock
            </p>
          </div>
        </Link>

        {/* Outstanding Receivables */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm text-red-700 mb-1">Outstanding Receivables</p>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(stats?.financials.receivables || 0)}
            </p>
            <p className="text-xs text-red-600 mt-2">Amount owed by customers</p>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* This Month's Sales */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">This Month's Sales</h3>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats?.sales.month || 0)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.sales.month_count || 0} invoices
          </p>
        </div>

        {/* This Month's Purchases */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">This Month's Purchases</h3>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats?.purchases.month || 0)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.purchases.month_count || 0} purchases
          </p>
        </div>

        {/* Inventory Value */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Inventory Value</h3>
          </div>
          <p className="text-2xl font-bold">
            {formatCurrency(stats?.inventory.total_value || 0)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Total stock value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Sales</h3>
            <Link to="/sales" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          {stats?.recent.sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.recent.sales.slice(0, 5).map((sale: any) => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sale.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.invoice_number} •{' '}
                      {format(new Date(sale.invoice_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {sale.currency === 'UGX'
                        ? formatCurrency(sale.total_amount)
                        : `$${sale.total_amount.toLocaleString()}`}
                    </p>
                    <div className="flex gap-1 justify-end mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(
                          sale.payment_status
                        )}`}
                      >
                        {sale.payment_status}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getDeliveryStatusColor(
                          sale.delivery_status
                        )}`}
                      >
                        {sale.delivery_status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Purchases</h3>
            <Link to="/purchases" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          {stats?.recent.purchases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No purchases yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.recent.purchases.slice(0, 5).map((purchase: any) => (
                <Link
                  key={purchase.id}
                  to={`/purchases/${purchase.id}`}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{purchase.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {purchase.purchase_number} •{' '}
                      {format(new Date(purchase.purchase_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {purchase.currency === 'UGX'
                        ? formatCurrency(purchase.total_amount)
                        : `$${purchase.total_amount.toLocaleString()}`}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(
                        purchase.payment_status
                      )}`}
                    >
                      {purchase.payment_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Selling Products (This Month)</h3>
          {stats?.top.products.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.top.products.map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity_sold} units sold
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(product.revenue_ugx)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Customers (This Month)</h3>
          {stats?.top.customers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No customer data yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.top.customers.map((customer: any, index: number) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.invoice_count} invoices
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(customer.total_spent)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/sales/new"
            className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors text-center group"
          >
            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-medium">New Sale</p>
          </Link>
          <Link
            to="/purchases/new"
            className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors text-center group"
          >
            <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-medium">New Purchase</p>
          </Link>
          <Link
            to="/sales/not-taken"
            className="p-4 border-2 border-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors text-center group"
          >
            <PackageX className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-medium text-primary">View Not Taken ⭐</p>
          </Link>
          <Link
            to="/inventory"
            className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors text-center group"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-medium">Inventory</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
