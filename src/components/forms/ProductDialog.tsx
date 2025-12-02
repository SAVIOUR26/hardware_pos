import { useState, useEffect } from 'react';
import { X, Package, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ProductDialogProps {
  product?: any; // If provided, edit mode; otherwise create mode
  onClose: () => void;
  onSuccess: () => void;
}

function ProductDialog({ product, onClose, onSuccess }: ProductDialogProps) {
  const isEditMode = !!product;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'Piece',
    barcode: '',
    cost_price_ugx: '',
    selling_price_ugx: '',
    selling_price_usd: '',
    current_stock: '',
    reorder_level: '',
    description: '',
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        unit: product.unit || 'Piece',
        barcode: product.barcode || '',
        cost_price_ugx: product.cost_price_ugx?.toString() || '',
        selling_price_ugx: product.selling_price_ugx?.toString() || '',
        selling_price_usd: product.selling_price_usd?.toString() || '',
        current_stock: product.current_stock?.toString() || '',
        reorder_level: product.reorder_level?.toString() || '',
        description: product.description || '',
        is_active: product.is_active !== 0,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (!formData.selling_price_ugx || parseFloat(formData.selling_price_ugx) <= 0) {
      toast.error('Valid selling price (UGX) is required');
      return;
    }

    try {
      setSubmitting(true);

      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        unit: formData.unit,
        barcode: formData.barcode.trim() || undefined,
        cost_price_ugx: parseFloat(formData.cost_price_ugx) || 0,
        cost_price_usd: parseFloat(formData.cost_price_ugx) / 3700 || 0, // Auto-calculate
        selling_price_ugx: parseFloat(formData.selling_price_ugx),
        selling_price_usd: parseFloat(formData.selling_price_usd) || parseFloat(formData.selling_price_ugx) / 3700,
        current_stock: parseFloat(formData.current_stock) || 0,
        reorder_level: parseFloat(formData.reorder_level) || 0,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active ? 1 : 0,
      };

      let result;
      if (isEditMode) {
        result = await window.api.inventory.updateProduct(product.id, productData);
      } else {
        result = await window.api.inventory.createProduct(productData);
      }

      if (result.success) {
        toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully!`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const commonCategories = [
    'Cement',
    'Steel',
    'Roofing',
    'Timber',
    'Paint',
    'Plumbing',
    'Electrical',
    'Tools',
    'Fasteners',
    'Blocks',
    'Aggregates',
  ];

  const commonUnits = ['Piece', 'Bag', 'Roll', 'Kg', 'Meter', 'Lorry', 'Sheet', 'Tin', 'Box', 'Set'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditMode ? 'Update product information' : 'Add a new product to inventory'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Product Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Hima Cement 50kg"
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  list="categories"
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="Select or type category"
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="categories">
                  {commonCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {commonUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Barcode/SKU</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => updateField('barcode', e.target.value)}
                  placeholder="Optional barcode or SKU"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Optional product description"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cost Price (UGX)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_price_ugx}
                  onChange={(e) => updateField('cost_price_ugx', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your purchase/cost price
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Selling Price (UGX) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.selling_price_ugx}
                  onChange={(e) => updateField('selling_price_ugx', e.target.value)}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customer price in UGX
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Selling Price (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.selling_price_usd}
                  onChange={(e) => updateField('selling_price_usd', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional USD price
                </p>
              </div>

              {formData.cost_price_ugx && formData.selling_price_ugx && (
                <div className="col-span-2">
                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                    <p className="text-sm font-medium">Profit Margin</p>
                    <p className="text-lg font-bold text-primary">
                      {(
                        ((parseFloat(formData.selling_price_ugx) -
                          parseFloat(formData.cost_price_ugx)) /
                          parseFloat(formData.selling_price_ugx)) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Profit: UGX{' '}
                      {(
                        parseFloat(formData.selling_price_ugx) -
                        parseFloat(formData.cost_price_ugx)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stock */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Stock Management</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isEditMode ? 'Current Stock' : 'Initial Stock'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.current_stock}
                  onChange={(e) => updateField('current_stock', e.target.value)}
                  placeholder="0"
                  disabled={isEditMode}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isEditMode && (
                  <p className="text-xs text-amber-600 mt-1">
                    Use stock adjustments to change stock levels
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.reorder_level}
                  onChange={(e) => updateField('reorder_level', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Active (available for sale)
              </span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update' : 'Create'} Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDialog;
