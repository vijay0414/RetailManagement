import { AlertTriangle, Phone, Bell, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Props:
 *  alerts  – stockAlerts array from context  (array of product objects)
 *  Shows the first alert; "Inform" / "Not Now" dismisses it from the queue.
 */
export default function StockAlertModal() {
  const { stockAlerts, dismissStockAlert, showToast } = useApp();

  if (!stockAlerts.length) return null;
  const product = stockAlerts[0];

  const handleInform = () => {
    showToast(`Notification sent to ${product.supplierName} (${product.supplierContact})`, 'success');
    dismissStockAlert(product.barcode);
  };

  const handleNotNow = () => dismissStockAlert(product.barcode);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="alert-title">
      <div className="modal">
        {/* Header */}
        <div className="modal-header modal-header--warning">
          <div className="modal-header-icon">
            <AlertTriangle size={22} />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title" id="alert-title">Low Stock Alert</h2>
            <p className="modal-subtitle">Stock has dropped below the reorder threshold</p>
          </div>
          {stockAlerts.length > 1 && (
            <span className="modal-queue-badge">+{stockAlerts.length - 1} more</span>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="alert-detail-grid">
            <AlertRow label="Product Name"    value={<strong>{product.name}</strong>} />
            <AlertRow label="Current Stock"   value={<span className="badge badge-red">{product.stock} unit{product.stock !== 1 ? 's' : ''} remaining</span>} />
            <AlertRow label="Reorder Level"   value={`${product.reorderThreshold} units`} />
            <AlertRow label="Supplier"        value={product.supplierName} />
            <AlertRow
              label="Contact"
              value={
                <span className="contact-value">
                  <Phone size={13} />
                  {product.supplierContact}
                </span>
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleNotNow}>
            <X size={14} /> Not Now
          </button>
          <button className="btn btn-primary" onClick={handleInform}>
            <Bell size={14} /> Inform Supplier
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ label, value }) {
  return (
    <div className="alert-detail-item">
      <span className="alert-detail-label">{label}</span>
      <span className="alert-detail-value">{value}</span>
    </div>
  );
}
