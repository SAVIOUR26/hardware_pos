import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ReportFilters {
  date_range: {
    start_date: string;
    end_date: string;
  };
  group_by: 'day' | 'product' | 'customer' | 'none';
}

function SalesReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    date_range: {
      start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    },
    group_by: 'none',
  });

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await window.api.reports.getSalesReport(filters);
      if (result.success) {
        setReportData(result.data);
      } else {
        toast.error('Failed to load sales report');
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
      toast.error('Failed to load sales report');
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

  const handleQuickDate = (period: 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date();
    let start, end;

    if (period === 'this_month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === 'last_month') {
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    setFilters({
      ...filters,
      date_range: {
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <input
            type="date"
            value={filters.date_range.start_date}
            onChange={(e) =>
              setFilters({
                ...filters,
                date_range: { ...filters.date_range, start_date: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <input
            type="date"
            value={filters.date_range.end_date}
            onChange={(e) =>
              setFilters({
                ...filters,
                date_range: { ...filters.date_range, end_date: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Group By</label>
          <select
            value={filters.group_by}
            onChange={(e) => setFilters({ ...filters, group_by: e.target.value as any })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="none">No Grouping</option>
            <option value="day">By Day</option>
            <option value="product">By Product</option>
            <option value="customer">By Customer</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Generate
          </button>
        </div>
      </div>

      {/* Quick Date Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            handleQuickDate('this_month');
            setTimeout(loadReport, 100);
          }}
          className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
        >
          This Month
        </button>
        <button
          onClick={() => {
            handleQuickDate('last_month');
            setTimeout(loadReport, 100);
          }}
          className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
        >
          Last Month
        </button>
        <button
          onClick={() => {
            handleQuickDate('this_year');
            setTimeout(loadReport, 100);
          }}
          className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
        >
          This Year
        </button>
      </div>

      {/* Summary Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Total Sales</p>
            <p className="text-2xl font-bold">{formatCurrency(reportData.summary.total_sales_ugx)}</p>
            <p className="text-xs opacity-75 mt-1">{reportData.summary.total_invoices} invoices</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Average Invoice</p>
            <p className="text-2xl font-bold">{formatCurrency(reportData.summary.average_invoice_ugx)}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Paid Percentage</p>
            <p className="text-2xl font-bold">{reportData.summary.paid_percentage.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">USD Sales</p>
            <p className="text-2xl font-bold">
              ${reportData.summary.total_sales_usd.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating report...</p>
          </div>
        </div>
      ) : reportData?.rows && reportData.rows.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {filters.group_by === 'day' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Sales</th>
                      <th className="text-right py-3 px-4 font-semibold">Invoices</th>
                      <th className="text-right py-3 px-4 font-semibold">Avg Invoice</th>
                    </>
                  )}
                  {filters.group_by === 'product' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-right py-3 px-4 font-semibold">Qty Sold</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Sales</th>
                      <th className="text-right py-3 px-4 font-semibold">Avg Sale</th>
                    </>
                  )}
                  {filters.group_by === 'customer' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Sales</th>
                      <th className="text-right py-3 px-4 font-semibold">Invoices</th>
                      <th className="text-right py-3 px-4 font-semibold">Paid</th>
                      <th className="text-right py-3 px-4 font-semibold">Unpaid</th>
                    </>
                  )}
                  {filters.group_by === 'none' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold">Payment</th>
                      <th className="text-center py-3 px-4 font-semibold">Delivery</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/30">
                    {filters.group_by === 'day' && (
                      <>
                        <td className="py-3 px-4">{formatDate(row.date)}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(row.total_sales_ugx)}
                        </td>
                        <td className="py-3 px-4 text-right">{row.invoice_count}</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(row.average_sale_ugx)}
                        </td>
                      </>
                    )}
                    {filters.group_by === 'product' && (
                      <>
                        <td className="py-3 px-4 font-medium">{row.product_name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{row.category}</td>
                        <td className="py-3 px-4 text-right">{row.quantity_sold}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(row.total_sales_ugx)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(row.average_sale_ugx)}
                        </td>
                      </>
                    )}
                    {filters.group_by === 'customer' && (
                      <>
                        <td className="py-3 px-4 font-medium">{row.customer_name}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(row.total_sales_ugx)}
                        </td>
                        <td className="py-3 px-4 text-right">{row.invoice_count}</td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {formatCurrency(row.paid_amount_ugx)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-600">
                          {formatCurrency(row.unpaid_amount_ugx)}
                        </td>
                      </>
                    )}
                    {filters.group_by === 'none' && (
                      <>
                        <td className="py-3 px-4 font-medium">{row.invoice_number}</td>
                        <td className="py-3 px-4">{row.customer_name}</td>
                        <td className="py-3 px-4">{formatDate(row.date)}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(row.total_sales_ugx)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.payment_status === 'Paid'
                                ? 'bg-green-100 text-green-800'
                                : row.payment_status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.delivery_status === 'Taken'
                                ? 'bg-green-100 text-green-800'
                                : row.delivery_status === 'Partially Taken'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.delivery_status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-muted/30 border-t border-border py-3 px-4">
            <p className="text-sm text-muted-foreground">
              Showing {reportData.rows.length} row{reportData.rows.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No data found</h3>
          <p className="text-muted-foreground">
            No sales data available for the selected period. Try adjusting your filters.
          </p>
        </div>
      )}
    </div>
  );
}

export default SalesReport;
