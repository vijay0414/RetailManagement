import { useState } from 'react';
import { AlertTriangle, Phone, Bell, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * StockAlertModal
 *
 * Appears on the Manager's screen whenever there are pending low-stock alerts.
 * stockAlerts is polled from GET /api/alerts/pending every 5 s by AppContext.
 *
 * "Inform Supplier" → PATCH /api/alerts/:id/inform  (notifyService logs to console)
 * "Not Now"         → PATCH /api/alerts/:id/dismiss
 */
export default function StockAlertModal() {
  const { stockAlerts, informAlert, dismissStockAlert, showToast } = useApp();
  const [acting, setActing] = useState(false);

  if (!stockAlerts.length) return null;

  const alert = stockAlerts[0];

  const handleInform = async () => {
    setActing(true);
    try {
      const msg = await informAlert(alert.alertId);
      showToast(msg || `Notification sent to ${alert.supplierName}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to notify supplier.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleNotNow = async () => {
    setActing(true);
    try {
      await dismissStockAlert(alert.alertId);
    } catch (err) {
      showToast(err.message || 'Failed to dismiss alert.', 'error');
    } finally {
      setActing(false);
    }
  };

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
            <AlertRow label="Product Name"  value={<strong>{alert.name}</strong>} />
            <AlertRow
              label="Current Stock"
              value={
                <span className="badge badge-red">
                  {alert.stock} unit{alert.stock !== 1 ? 's' : ''} remaining
                </span>
              }
            />
            <AlertRow label="Reorder Level" value={`${alert.reorderThreshold} units`} />
            <AlertRow label="Supplier"      value={alert.supplierName} />
            <AlertRow
              label="Contact"
              value={
                <span className="contact-value">
                  <Phone size={13} />
                  {alert.supplierContact}
                </span>
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleNotNow} disabled={acting}>
            <X size={14} /> Not Now
          </button>
          <button className="btn btn-primary" onClick={handleInform} disabled={acting}>
            {acting ? <span className="spinner-sm"/> : <Bell size={14} />}
            Inform Supplier
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
