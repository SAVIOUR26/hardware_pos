import { useState, useEffect } from 'react';
import { User, Plus, Search, Edit, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import CustomerDialog from '@/components/forms/CustomerDialog';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  created_at: string;
}

function CustomersIndex() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const result = await window.api.customer.list({
        search: searchTerm || undefined,
        limit: 1000,
      });

      if (result.success) {
        setCustomers(result.data.customers);
      } else {
        toast.error('Failed to load customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
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
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
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
            <User className="w-8 h-8 text-primary" />
            Customers
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer database
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setShowCustomerDialog(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-card border border-primary rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">With Phone</p>
          <p className="text-2xl font-bold text-primary">
            {customers.filter((c) => c.phone).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">With Email</p>
          <p className="text-2xl font-bold">
            {customers.filter((c) => c.email).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Customers Table */}
      {customers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Add your first customer to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setShowCustomerDialog(true);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold">Address</th>
                  <th className="text-right py-3 px-4 font-semibold">Credit Limit</th>
                  <th className="text-left py-3 px-4 font-semibold">Added</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <p className="font-medium">{customer.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {!customer.phone && !customer.email && (
                          <span className="text-sm text-muted-foreground">No contact</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {customer.address || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {customer.credit_limit > 0 ? (
                        <span className="font-medium">
                          {formatCurrency(customer.credit_limit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(customer.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerDialog(true);
                          }}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit className="w-4 h-4" />
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
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Customer Dialog */}
      {showCustomerDialog && (
        <CustomerDialog
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerDialog(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}

export default CustomersIndex;
