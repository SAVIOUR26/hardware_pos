import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
}

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  quantity_delivered: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  unit?: string;
}

interface ReturnItem {
  sales_invoice_item_id: number;
  product_id: number;
  product_name: string;
  quantity_returned: number;
  max_quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  condition: 'Good' | 'Damaged' | 'Defective';
  restock: number;
}

function NewSalesReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceIdParam = searchParams.get('invoice_id');

  // Invoice selection
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceResults, setInvoiceResults] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Return data
  const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('Customer Request');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);

  // Load invoice from URL param
  useEffect(() => {
    if (invoiceIdParam) {
      loadInvoice(parseInt(invoiceIdParam, 10));
    }
  }, [invoiceIdParam]);

  // Search invoices
  useEffect(() => {
    const searchInvoices = async () => {
      if (invoiceSearch.length < 2) {
        setInvoiceResults([]);
        return;
      }

      const result = await window.api.sales.list({
        search: invoiceSearch,
        is_quotation: 0,
        limit: 10,
      });

      if (result.success) {
        setInvoiceResults(result.data.invoices || []);
      }
    };

    const debounce = setTimeout(searchInvoices, 300);
    return () => clearTimeout(debounce);
  }, [invoiceSearch]);

  const loadInvoice = async (invoiceId: number) => {
    try {
      const result = await window.api.sales.get(invoiceId);

      if (result.success) {
        const invoice = result.data;
        setSelectedInvoice(invoice);
        setInvoiceItems(invoice.items || []);

        // Initialize return items with all invoice items
        const items: ReturnItem[] = invoice.items.map((item: InvoiceItem) => ({
          sales_invoice_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_returned: 0,
          max_quantity: item.quantity_delivered || item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          tax_percent: item.tax_percent || 0,
          condition: 'Good' as const,
          restock: 1,
        }));

        setReturnItems(items);
        setInvoiceSearch('');
        setShowInvoiceDropdown(false);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
    }
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    loadInvoice(invoice.id);
  };

  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    const updated = [...returnItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-update restock based on condition
    if (field === 'condition') {
      updated[index].restock = value === 'Good' ? 1 : 0;
    }

    setReturnItems(updated);
  };

  const handleSave = async () => {
    // Validation
    if (!selectedInvoice) {
      toast.error('Please select an invoice');
      return;
    }

    const itemsToReturn = returnItems.filter((item) => item.quantity_returned > 0);

    if (itemsToReturn.length === 0) {
      toast.error('Please add at least one item to return');
      return;
    }

    // Validate quantities
    for (const item of itemsToReturn) {
      if (item.quantity_returned > item.max_quantity) {
        toast.error(`${item.product_name}: Return quantity cannot exceed ${item.max_quantity}`);
        return;
      }
    }

    if (!reason) {
      toast.error('Please provide a reason for the return');
      return;
    }

    try {
      setSaving(true);

      const returnData = {
        sales_invoice_id: selectedInvoice.id,
        customer_id: selectedInvoice.customer_id,
        return_date: returnDate,
        reason,
        notes: notes || undefined,
        currency: selectedInvoice.currency,
        exchange_rate: selectedInvoice.exchange_rate || 1,
        items: itemsToReturn.map((item) => ({
          sales_invoice_item_id: item.sales_invoice_item_id,
          product_id: item.product_id,
          quantity_returned: item.quantity_returned,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
          condition: item.condition,
          restock: item.restock,
        })),
        refund_method: refundMethod,
        refund_status: 'Pending',
      };

      const result = await window.api.salesReturn.create(returnData);

      if (result.success) {
        toast.success(`Return ${result.data.return.return_number} created successfully!`);

        // Navigate to return view
        navigate(`/sales/returns/view/${result.data.return.id}`);
      } else {
        toast.error(result.error?.message || 'Failed to create return');
      }
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((sum, item) => {
      if (item.quantity_returned === 0) return sum;

      const baseAmount = item.quantity_returned * item.unit_price;
      const discount = baseAmount * (item.discount_percent / 100);
      const taxable = baseAmount - discount;
      const tax = taxable * (item.tax_percent / 100);

      return sum + taxable + tax;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    const currency = selectedInvoice?.currency || 'UGX';
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Damaged':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Defective':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

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
            New Sales Return
          </h1>
          <p className="text-muted-foreground mt-1">Process a product return and refund</p>
        </div>
      </div>

      {/* Invoice Selection */}
      {!selectedInvoice && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Select Invoice</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice number or customer name..."
              value={invoiceSearch}
              onChange={(e) => {
                setInvoiceSearch(e.target.value);
                setShowInvoiceDropdown(true);
              }}
              onFocus={() => setShowInvoiceDropdown(true)}
              className="w-full pl-12 pr-4 py-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-lg"
              autoFocus
            />
          </div>

          {/* Invoice Results Dropdown */}
          {showInvoiceDropdown && invoiceResults.length > 0 && (
            <div className="absolute z-10 mt-2 w-full max-w-2xl bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {invoiceResults.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => handleSelectInvoice(invoice)}
                  className="w-full p-4 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold">{invoice.invoice_number}</span>
                      <p className="text-sm text-muted-foreground mt-1">{invoice.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-3">
            Enter an invoice number or customer name to search for the original sale
          </p>
        </div>
      )}

      {/* Return Form */}
      {selectedInvoice && (
        <>
          {/* Invoice Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-900 font-medium">Invoice Number</p>
                <p className="font-mono font-semibold mt-1">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-blue-900 font-medium">Customer</p>
                <p className="font-semibold mt-1">{selectedInvoice.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-blue-900 font-medium">Invoice Date</p>
                <p className="mt-1">{format(new Date(selectedInvoice.invoice_date), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm text-blue-900 font-medium">Original Amount</p>
                <p className="font-semibold mt-1">{formatCurrency(selectedInvoice.total_amount)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setReturnItems([]);
              }}
              className="text-sm text-blue-700 hover:underline mt-3"
            >
              Change Invoice
            </button>
          </div>

          {/* Return Details */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Return Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Return Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Customer Request">Customer Request</option>
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Wrong Item">Wrong Item</option>
                  <option value="Defective">Defective</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit Note">Credit Note</option>
                  <option value="Exchange">Exchange</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Return Items */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Items to Return</h2>

            <div className="space-y-3">
              {returnItems.map((item, index) => (
                <div
                  key={item.sales_invoice_item_id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Max: {item.max_quantity} available
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                      <input
                        type="number"
                        min="0"
                        max={item.max_quantity}
                        step="1"
                        value={item.quantity_returned}
                        onChange={(e) =>
                          updateReturnItem(index, 'quantity_returned', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Condition</label>
                      <select
                        value={item.condition}
                        onChange={(e) => updateReturnItem(index, 'condition', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm font-medium ${getConditionColor(
                          item.condition
                        )}`}
                      >
                        <option value="Good">Good</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Defective">Defective</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Restock?</label>
                      <div className="flex items-center gap-2 h-10">
                        {item.restock === 1 ? (
                          <span className="flex items-center gap-1 text-green-700 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700 text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            No
                          </span>
                        )}
                        {item.condition !== 'Good' && (
                          <span className="text-xs text-muted-foreground">(Auto)</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Refund Amount</p>
                      <p className="font-semibold">
                        {formatCurrency(
                          (() => {
                            if (item.quantity_returned === 0) return 0;
                            const base = item.quantity_returned * item.unit_price;
                            const discount = base * (item.discount_percent / 100);
                            const taxable = base - discount;
                            const tax = taxable * (item.tax_percent / 100);
                            return taxable + tax;
                          })()
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Banner */}
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Stock Management:</strong> Good condition items will be automatically restocked.
                Damaged/Defective items will be logged but not added back to inventory.
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Return Summary</h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Items to Return:</span>
                <span>{returnItems.filter((i) => i.quantity_returned > 0).length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Items to Restock:</span>
                <span>
                  {returnItems.filter((i) => i.quantity_returned > 0 && i.restock === 1).length}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Refund Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(calculateReturnTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => navigate('/sales/returns')}
              className="px-6 py-3 border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || returnItems.filter((i) => i.quantity_returned > 0).length === 0}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NewSalesReturn;
