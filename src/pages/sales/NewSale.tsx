import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  User,
  Package,
  DollarSign,
  Calendar,
  Save,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import CustomerDialog from '@/components/forms/CustomerDialog';

interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  subtotal: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  selling_price_ugx: number;
  selling_price_usd: number;
  available_stock: number;
  unit: string;
}

function NewSale() {
  const navigate = useNavigate();

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Invoice data
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currency, setCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isQuotation, setIsQuotation] = useState(false);

  // Payment details
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Collection details (for "Not Taken" workflow)
  const [expectedCollectionDate, setExpectedCollectionDate] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }

      const result = await window.api.customer.search(customerSearch, 10);
      if (result.success) {
        setCustomerResults(result.data);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch]);

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
  const calculateItemSubtotal = (item: InvoiceItem) => {
    const baseAmount = item.quantity * item.unit_price;
    const discountAmount = baseAmount * (item.discount_percent / 100);
    const taxableAmount = baseAmount - discountAmount;
    const taxAmount = taxableAmount * (item.tax_percent / 100);
    return taxableAmount + taxAmount;
  };

  const totals = items.reduce(
    (acc, item) => {
      const baseAmount = item.quantity * item.unit_price;
      const discountAmount = baseAmount * (item.discount_percent / 100);
      const taxableAmount = baseAmount - discountAmount;
      const taxAmount = taxableAmount * (item.tax_percent / 100);

      return {
        subtotal: acc.subtotal + taxableAmount,
        discount: acc.discount + discountAmount,
        tax: acc.tax + taxAmount,
        total: acc.total + (taxableAmount + taxAmount),
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  // Add product to invoice
  const handleAddProduct = (product: Product) => {
    // Check if already added
    if (items.find((item) => item.product_id === product.id)) {
      toast.error('Product already added to invoice');
      return;
    }

    const newItem: InvoiceItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: currency === 'UGX' ? product.selling_price_ugx : product.selling_price_usd,
      discount_percent: 0,
      tax_percent: 0,
      subtotal: currency === 'UGX' ? product.selling_price_ugx : product.selling_price_usd,
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
    toast.success(`${product.name} added`);
  };

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
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

  // Save invoice
  const handleSave = async () => {
    // Validation
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate stock availability
    for (const item of items) {
      const productResult = await window.api.inventory.getProduct(item.product_id);
      if (productResult.success) {
        const product = productResult.data;
        if (!isQuotation && item.quantity > product.available_stock) {
          toast.error(
            `Insufficient stock for ${item.product_name}. Available: ${product.available_stock}`
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      const invoiceData = {
        customer_id: selectedCustomer.id,
        invoice_date: invoiceDate,
        currency,
        exchange_rate: currency === 'USD' ? exchangeRate : 1,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
        })),
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        is_quotation: isQuotation ? 1 : 0,
        expected_collection_date: expectedCollectionDate || undefined,
        collection_notes: collectionNotes || undefined,
      };

      const result = await window.api.sales.create(invoiceData);

      if (result.success) {
        toast.success(
          `${isQuotation ? 'Quotation' : 'Invoice'} ${result.data.invoice.invoice_number} created!`
        );

        // Ask if user wants to print
        if (confirm('Invoice created successfully! Would you like to print it?')) {
          // TODO: Implement printing
          toast.info('Printing feature coming soon');
        }

        // Navigate to invoice view or sales list
        navigate('/sales');
      } else {
        toast.error(result.error?.message || 'Failed to create invoice');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            {isQuotation ? 'New Quotation' : 'New Sale'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new sales invoice or quotation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isQuotation}
              onChange={(e) => setIsQuotation(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Quotation</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              Customer
            </h2>

            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-primary/10 border border-primary rounded-lg p-4">
                <div>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.phone || selectedCustomer.email || 'No contact info'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-accent"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search customer by name, phone, or email..."
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-accent border-b border-border last:border-b-0"
                      >
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone || customer.email}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {showCustomerDropdown && customerSearch.length >= 2 && customerResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-center">
                    <p className="text-muted-foreground mb-2">No customers found</p>
                    <button
                      onClick={() => {
                        setShowCustomerDropdown(false);
                        setShowCustomerDialog(true);
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      + Add new customer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground" />
              Items
            </h2>

            {/* Product Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search product by name or barcode..."
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {showProductDropdown && productResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full text-left px-4 py-3 hover:bg-accent border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.available_stock} {product.unit}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(
                            currency === 'UGX' ? product.selling_price_ugx : product.selling_price_usd
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No items added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Search and select products to add to this invoice
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Product</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Price</th>
                      <th className="text-right py-2 px-2">Disc%</th>
                      <th className="text-right py-2 px-2">Tax%</th>
                      <th className="text-right py-2 px-2">Subtotal</th>
                      <th className="text-center py-2 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="py-3 px-2">
                          <p className="font-medium text-sm">{item.product_name}</p>
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-right border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.discount_percent}
                            onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-right border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.tax_percent}
                            onChange={(e) => updateItem(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-right border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
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

        {/* Sidebar - Invoice Details */}
        <div className="space-y-6">
          {/* Date and Currency */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'UGX' | 'USD')}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {currency === 'USD' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Exchange Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-destructive">-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {!isQuotation && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Payment</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Amount Paid</label>
                  <input
                    type="number"
                    min="0"
                    max={totals.total}
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                {amountPaid < totals.total && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-500 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Outstanding: {formatCurrency(totals.total - amountPaid)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collection Details (Not Taken workflow) */}
          {!isQuotation && paymentStatus === 'Paid' && (
            <div className="bg-card border-2 border-primary rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2">Collection Details ⭐</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Track when customer will collect items
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expected Collection Date
                  </label>
                  <input
                    type="date"
                    value={expectedCollectionDate}
                    onChange={(e) => setExpectedCollectionDate(e.target.value)}
                    min={invoiceDate}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Collection Notes
                  </label>
                  <textarea
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="E.g., Customer will send driver..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving || !selectedCustomer || items.length === 0}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save {isQuotation ? 'Quotation' : 'Invoice'}
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/sales')}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Customer Dialog */}
      {showCustomerDialog && (
        <CustomerDialog
          onClose={() => setShowCustomerDialog(false)}
          onSuccess={async () => {
            // Refresh customer search to include newly added customer
            if (customerSearch.length >= 2) {
              const result = await window.api.customer.search(customerSearch, 10);
              if (result.success) {
                setCustomerResults(result.data);
                // Auto-select the newly created customer if it's the only result
                if (result.data.length === 1) {
                  setSelectedCustomer(result.data[0]);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default NewSale;
