import { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, MapPin, CreditCard, Banknote, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SupplierDialogProps {
  supplier?: any; // Existing supplier for edit mode
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierDialog({ supplier, onClose, onSuccess }: SupplierDialogProps) {
  const isEditMode = !!supplier;

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tin: '',
    bank_account: '',
    payment_terms: '',
  });

  // Populate form in edit mode
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        company_name: supplier.company_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tin: supplier.tin || '',
        bank_account: supplier.bank_account || '',
        payment_terms: supplier.payment_terms || '',
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    const supplierData = {
      name: formData.name.trim(),
      company_name: formData.company_name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      tin: formData.tin.trim() || undefined,
      bank_account: formData.bank_account.trim() || undefined,
      payment_terms: formData.payment_terms.trim() || undefined,
    };

    let result;
    if (isEditMode) {
      result = await window.api.supplier.update(supplier.id, supplierData);
    } else {
      result = await window.api.supplier.create(supplierData);
    }

    if (result.success) {
      toast.success(isEditMode ? 'Supplier updated successfully' : 'Supplier created successfully');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error?.message || 'Failed to save supplier');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Basic Information
            </h3>

            {/* Name (Required) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter supplier name"
                required
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Company/Business Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter company name (optional)"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Contact Information
            </h3>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 0700123456"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., supplier@example.com"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Physical Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2}
                placeholder="Enter physical address"
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Business Details
            </h3>

            {/* TIN */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                TIN (Tax Identification Number)
              </label>
              <input
                type="text"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 1234567890"
              />
            </div>

            {/* Bank Account */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                Bank Account Details
              </label>
              <input
                type="text"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Stanbic Bank - 9876543210"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 30 days, Net 15, Cash on delivery"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-input rounded-lg hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              {isEditMode ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
