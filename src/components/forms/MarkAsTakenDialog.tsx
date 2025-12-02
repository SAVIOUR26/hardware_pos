import { useState } from 'react';
import { X, Package, User, Truck, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface MarkAsTakenDialogProps {
  invoice: any;
  items: any[];
  onClose: () => void;
  onSuccess: () => void;
}

interface DeliveryItem {
  invoice_item_id: number;
  product_id: number;
  product_name: string;
  quantity_remaining: number;
  quantity_to_deliver: number;
}

function MarkAsTakenDialog({ invoice, items, onClose, onSuccess }: MarkAsTakenDialogProps) {
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveredBy, setDeliveredBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showPrices, setShowPrices] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize delivery quantities
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>(
    items.map((item) => ({
      invoice_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity_remaining: item.quantity_remaining,
      quantity_to_deliver: item.quantity_remaining, // Default to full delivery
    }))
  );

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseInt(value) || 0;
    const maxQty = deliveryItems[index].quantity_remaining;

    if (quantity > maxQty) {
      toast.error(`Cannot deliver more than ${maxQty} units`);
      return;
    }

    const updated = [...deliveryItems];
    updated[index].quantity_to_deliver = quantity;
    setDeliveryItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one item is being delivered
    const itemsToDeliver = deliveryItems.filter((item) => item.quantity_to_deliver > 0);

    if (itemsToDeliver.length === 0) {
      toast.error('Please specify at least one item to deliver');
      return;
    }

    // Validate received by field
    if (!receivedBy.trim()) {
      toast.error('Please enter who received the items');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare request
      const request = {
        invoice_id: invoice.id,
        items: itemsToDeliver.map((item) => ({
          invoice_item_id: item.invoice_item_id,
          product_id: item.product_id,
          quantity_to_deliver: item.quantity_to_deliver,
        })),
        delivery_date: deliveryDate,
        delivered_by: deliveredBy || undefined,
        received_by: receivedBy,
        vehicle_number: vehicleNumber || undefined,
        notes: notes || undefined,
        show_prices: showPrices,
        show_totals: showTotals,
      };

      // Call backend
      const result = await window.api.delivery.markAsTaken(request);

      if (result.success) {
        toast.success(
          `Delivery note ${result.data.delivery_note.delivery_note_number} created successfully!`
        );
        onSuccess(); // Refresh the report
        onClose(); // Close dialog
      } else {
        toast.error(result.error?.message || 'Failed to mark as taken');
      }
    } catch (error: any) {
      console.error('Error marking as taken:', error);
      toast.error('Failed to mark as taken');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Mark as Taken
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {invoice.invoice_number} - {invoice.customer_name}
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
          {/* Items Being Delivered */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground" />
              Items Being Delivered
            </h3>
            <div className="space-y-3">
              {deliveryItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.product_name}</span>
                    <span className="text-sm text-muted-foreground">
                      Available: {item.quantity_remaining}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground">
                      Delivering now:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity_remaining}
                      value={item.quantity_to_deliver}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-24 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {item.quantity_to_deliver < item.quantity_remaining && (
                      <span className="text-sm text-amber-600 font-medium">
                        Partial delivery
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-muted-foreground" />
              Delivery Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivery Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivered By
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={deliveredBy}
                    onChange={(e) => setDeliveredBy(e.target.value)}
                    placeholder="Staff name"
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Received By <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Customer representative"
                    required
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Vehicle Number
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Delivery Note Options ⭐ */}
          <div>
            <h3 className="font-semibold mb-3">Delivery Note Options ⭐</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show prices on delivery note</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTotals}
                  onChange={(e) => setShowTotals(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show totals on delivery note</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⭐ Client requirement: Option to hide prices when printing delivery note
            </p>
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
                Creating Delivery Note...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Create Delivery Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarkAsTakenDialog;
