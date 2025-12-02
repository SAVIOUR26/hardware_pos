import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  AlertTriangle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import ProductDialog from '@/components/forms/ProductDialog';

interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  barcode: string;
  selling_price_ugx: number;
  selling_price_usd: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  is_active: number;
}

function InventoryIndex() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'good'>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory, stockFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await window.api.inventory.listProducts({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        stock_status: stockFilter === 'all' ? undefined : stockFilter,
        limit: 1000,
      });

      if (result.success) {
        setProducts(result.data.products);

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(result.data.products.map((p: Product) => p.category)),
        ].filter(Boolean) as string[];
        setCategories(uniqueCategories.sort());
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.available_stock <= 0) {
      return { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (product.available_stock <= product.reorder_level) {
      return { label: 'Low Stock', color: 'text-amber-600', bg: 'bg-amber-50' };
    } else {
      return { label: 'In Stock', color: 'text-green-600', bg: 'bg-green-50' };
    }
  };

  const formatCurrency = (amount: number, currency: 'UGX' | 'USD' = 'UGX') => {
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

  const lowStockCount = products.filter(
    (p) => p.available_stock > 0 && p.available_stock <= p.reorder_level
  ).length;
  const outOfStockCount = products.filter((p) => p.available_stock <= 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
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
            <Package className="w-8 h-8 text-primary" />
            Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your products and stock levels
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedProduct(null);
            setShowProductDialog(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Products</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>

        <div className="bg-card border border-green-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">In Stock</p>
          <p className="text-2xl font-bold text-green-600">
            {products.filter((p) => p.available_stock > p.reorder_level).length}
          </p>
        </div>

        <div className="bg-card border border-amber-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
        </div>

        <div className="bg-card border border-red-500 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or barcode..."
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Stock Levels</option>
              <option value="good">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory || stockFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first product to get started'}
          </p>
          {!searchTerm && !selectedCategory && stockFilter === 'all' && (
            <button
              onClick={() => {
                setSelectedProduct(null);
                setShowProductDialog(true);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-center py-3 px-4 font-semibold">Current</th>
                  <th className="text-center py-3 px-4 font-semibold">Reserved</th>
                  <th className="text-center py-3 px-4 font-semibold">Available</th>
                  <th className="text-right py-3 px-4 font-semibold">Price (UGX)</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.barcode} • {product.unit}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-muted rounded text-sm">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        {product.current_stock}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {product.reserved_stock > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {product.reserved_stock}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            product.available_stock <= 0
                              ? 'text-red-600'
                              : product.available_stock <= product.reorder_level
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }`}
                        >
                          {product.available_stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(product.selling_price_ugx)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {product.available_stock <= 0 ? (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          ) : product.available_stock <= product.reorder_level ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <span className={`text-sm ${status.color}`}>{status.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowProductDialog(true);
                            }}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-muted/30 border-t border-border py-3 px-4">
            <p className="text-sm text-muted-foreground">
              Showing {products.length} product{products.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Product Dialog */}
      {showProductDialog && (
        <ProductDialog
          product={selectedProduct}
          onClose={() => {
            setShowProductDialog(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

export default InventoryIndex;
