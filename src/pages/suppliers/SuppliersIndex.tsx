import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SupplierDialog from '@/components/forms/SupplierDialog';

interface Supplier {
  id: number;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tin: string | null;
  bank_account: string | null;
  payment_terms: string | null;
  current_balance_ugx: number;
  current_balance_usd: number;
  created_at: string;
}

export default function SuppliersIndex() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [searchTerm, suppliers]);

  const loadSuppliers = async () => {
    setLoading(true);
    const result = await window.api.supplier.list();
    if (result.success) {
      setSuppliers(result.data.suppliers);
    } else {
      toast.error('Failed to load suppliers');
    }
    setLoading(false);
  };

  const filterSuppliers = () => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(term) ||
        supplier.company_name?.toLowerCase().includes(term) ||
        supplier.phone?.includes(term) ||
        supplier.email?.toLowerCase().includes(term)
    );
    setFilteredSuppliers(filtered);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setShowSupplierDialog(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierDialog(true);
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      return;
    }

    const result = await window.api.supplier.delete(supplier.id);
    if (result.success) {
      toast.success('Supplier deleted successfully');
      loadSuppliers();
    } else {
      toast.error(result.error?.message || 'Failed to delete supplier');
    }
  };

  // Calculate stats
  const totalSuppliers = suppliers.length;
  const suppliersWithPhone = suppliers.filter((s) => s.phone).length;
  const suppliersWithEmail = suppliers.filter((s) => s.email).length;
  const totalOwing = suppliers.reduce((sum, s) => sum + s.current_balance_ugx, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage your suppliers and vendors</p>
        </div>
        <button
          onClick={handleAddSupplier}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Suppliers</p>
          <p className="text-2xl font-bold mt-1">{totalSuppliers}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">With Phone Number</p>
          <p className="text-2xl font-bold mt-1">{suppliersWithPhone}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">With Email</p>
          <p className="text-2xl font-bold mt-1">{suppliersWithEmail}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Owing</p>
          <p className="text-2xl font-bold mt-1">
            UGX {totalOwing.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search suppliers by name, company, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers yet. Add your first supplier to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Supplier Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Company</th>
                  <th className="text-left py-3 px-4 font-semibold">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold">Payment Terms</th>
                  <th className="text-right py-3 px-4 font-semibold">Balance (UGX)</th>
                  <th className="text-left py-3 px-4 font-semibold">Created</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.tin && (
                        <div className="text-xs text-muted-foreground">
                          TIN: {supplier.tin}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {supplier.company_name ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{supplier.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {supplier.payment_terms ? (
                        <span className="text-sm">{supplier.payment_terms}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          supplier.current_balance_ugx > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {supplier.current_balance_ugx.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(supplier.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Edit supplier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Dialog */}
      {showSupplierDialog && (
        <SupplierDialog
          supplier={selectedSupplier}
          onClose={() => {
            setShowSupplierDialog(false);
            setSelectedSupplier(null);
          }}
          onSuccess={() => {
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
}
