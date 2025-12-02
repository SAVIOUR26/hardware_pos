import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Search,
  Building2,
  Package,
  DollarSign,
  Calendar,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import SupplierDialog from '@/components/forms/SupplierDialog';

interface PurchaseItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  update_cost_price: boolean;
  subtotal: number;
}

interface Supplier {
  id: number;
  name: string;
  company_name?: string;
  phone?: string;
}

interface Product {
  id: number;
  name: string;
  cost_price_ugx: number;
  cost_price_usd: number;
  current_stock: number;
  unit: string;
}

function NewPurchase() {
  const navigate = useNavigate();

  // Supplier selection
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Purchase data
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [currency, setCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [exchangeRate, setExchangeRate] = useState(1);

  // Payment details
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [saving, setSaving] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);

  // Load exchange rate
  useEffect(() => {
    const loadExchangeRate = async () => {
      const result = await window.api.database.query(
        "SELECT value FROM settings WHERE key = 'exchange_rate_usd'",
        []
      );
      if (result && result.length > 0) {
        setExchangeRate(parseFloat(result[0].value));
      }
    };
    loadExchangeRate();
  }, []);

  // Search suppliers
  useEffect(() => {
    const searchSuppliers = async () => {
      if (supplierSearch.length < 2) {
        setSupplierResults([]);
        return;
      }

      const result = await window.api.supplier.search(supplierSearch, 10);
      if (result.success) {
        setSupplierResults(result.data);
      }
    };

    const debounce = setTimeout(searchSuppliers, 300);
    return () => clearTimeout(debounce);
  }, [supplierSearch]);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (productSearch.length < 2) {
        setProductResults([]);
        return;
      }

      const result = await window.api.inventory.listProducts({
        search: productSearch,
        limit: 10,
      });
      if (result.success) {
        setProductResults(result.data.products);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [productSearch]);

  // Calculate totals
  const calculateItemSubtotal = (item: PurchaseItem) => {
    const baseAmount = item.quantity * item.unit_price;
    const taxAmount = baseAmount * (item.tax_percent / 100);
    return baseAmount + taxAmount;
  };

  const totals = items.reduce(
    (acc, item) => {
      const baseAmount = item.quantity * item.unit_price;
      const taxAmount = baseAmount * (item.tax_percent / 100);

      return {
        subtotal: acc.subtotal + baseAmount,
        tax: acc.tax + taxAmount,
        total: acc.total + (baseAmount + taxAmount),
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  // Add product to purchase
  const handleAddProduct = (product: Product) => {
    // Check if already added
    if (items.find((item) => item.product_id === product.id)) {
      toast.error('Product already added to purchase');
      return;
    }

    const newItem: PurchaseItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: currency === 'UGX' ? product.cost_price_ugx : product.cost_price_usd,
      tax_percent: 0,
      update_cost_price: false,
      subtotal: currency === 'UGX' ? product.cost_price_ugx : product.cost_price_usd,
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
    toast.success(`${product.name} added`);
  };

  // Update item
  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].subtotal = calculateItemSubtotal(updated[index]);
    setItems(updated);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Update amount paid when total or payment status changes
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountPaid(totals.total);
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid(0);
    }
  }, [totals.total, paymentStatus]);

  // Save purchase
  const handleSave = async () => {
    // Validation
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (paymentStatus === 'Paid' && amountPaid <= 0) {
      toast.error('Please enter the amount paid');
      return;
    }

    setSaving(true);

    const purchaseData = {
      supplier_id: selectedSupplier.id,
      purchase_date: purchaseDate,
      supplier_invoice_number: supplierInvoiceNumber || undefined,
      currency,
      exchange_rate: currency === 'USD' ? exchangeRate : 1,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percent: item.tax_percent,
        update_cost_price: item.update_cost_price,
      })),
      payment_status: paymentStatus,
      amount_paid: paymentStatus === 'Paid' ? amountPaid : 0,
      payment_method: paymentStatus === 'Paid' ? paymentMethod : undefined,
    };

    const result = await window.api.purchase.create(purchaseData);

    if (result.success) {
      toast.success('Purchase created successfully');
      navigate('/purchases');
    } else {
      toast.error(result.error?.message || 'Failed to create purchase');
    }

    setSaving(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-8 h-8" />
              New Purchase
            </h1>
            <p className="text-muted-foreground mt-1">Record a new purchase from supplier</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0 || !selectedSupplier}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Purchase'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Supplier Information
            </h3>

            {selectedSupplier ? (
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="font-medium">{selectedSupplier.name}</p>
                  {selectedSupplier.company_name && (
                    <p className="text-sm text-muted-foreground">{selectedSupplier.company_name}</p>
                  )}
                  {selectedSupplier.phone && (
                    <p className="text-sm text-muted-foreground">{selectedSupplier.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search supplier by name or phone..."
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {showSupplierDropdown && supplierResults.length > 0 && (
                  <div className="border border-border rounded-lg bg-card shadow-lg max-h-60 overflow-y-auto">
                    {supplierResults.map((supplier) => (
                      <button
                        key={supplier.id}
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setShowSupplierDropdown(false);
                          setSupplierSearch('');
                        }}
                        className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                      >
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.company_name && (
                          <p className="text-sm text-muted-foreground">{supplier.company_name}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showSupplierDropdown && supplierSearch.length >= 2 && supplierResults.length === 0 && (
                  <div className="border border-border rounded-lg bg-card p-3 text-center text-muted-foreground">
                    <p>No suppliers found.</p>
                    <button
                      onClick={() => setShowSupplierDialog(true)}
                      className="text-primary hover:underline mt-2"
                    >
                      Add new supplier
                    </button>
                  </div>
                )}

                {supplierSearch.length === 0 && (
                  <button
                    onClick={() => setShowSupplierDialog(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    + Add new supplier
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Selection & Items */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items
            </h3>

            {/* Product Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products to add..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {showProductDropdown && productResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border border-border rounded-lg bg-card shadow-lg max-h-60 overflow-y-auto">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                    >
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {product.current_stock} {product.unit} | Cost:{' '}
                        {currency === 'UGX'
                          ? `UGX ${product.cost_price_ugx.toLocaleString()}`
                          : `USD ${product.cost_price_usd.toLocaleString()}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No items added yet</p>
                <p className="text-sm">Search and add products to this purchase</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-2 px-2">Product</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Tax %</th>
                      <th className="text-center py-2 px-2">Update Cost</th>
                      <th className="text-right py-2 px-2">Total</th>
                      <th className="text-center py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 px-2">
                          <p className="font-medium text-sm">{item.product_name}</p>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-center border border-input rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 text-right border border-input rounded"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.tax_percent}
                            onChange={(e) =>
                              updateItem(index, 'tax_percent', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-right border border-input rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.update_cost_price}
                            onChange={(e) =>
                              updateItem(index, 'update_cost_price', e.target.checked)
                            }
                            className="w-4 h-4"
                            title="Update product cost price with this purchase price"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {item.subtotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Details */}
        <div className="space-y-6">
          {/* Purchase Details */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Purchase Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier Invoice #</label>
                <input
                  type="text"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'UGX' | 'USD')}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                >
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {currency === 'USD' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Exchange Rate</label>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    1 USD = {exchangeRate} UGX
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Unpaid')}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              {paymentStatus === 'Paid' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount Paid</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-lg"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Summary</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {currency} {totals.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {currency} {totals.tax.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    {currency} {totals.total.toLocaleString()}
                  </span>
                </div>
                {currency === 'USD' && (
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    ≈ UGX {(totals.total * exchangeRate).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Dialog */}
      {showSupplierDialog && (
        <SupplierDialog
          onClose={() => setShowSupplierDialog(false)}
          onSuccess={async () => {
            // Refresh supplier search to include newly added supplier
            if (supplierSearch.length >= 2) {
              const result = await window.api.supplier.search(supplierSearch, 10);
              if (result.success) {
                setSupplierResults(result.data);
                // Auto-select the newly created supplier if it's the only result
                if (result.data.length === 1) {
                  setSelectedSupplier(result.data[0]);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default NewPurchase;
