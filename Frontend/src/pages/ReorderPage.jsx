import { useState } from 'react';
import { RefreshCw, CheckCircle, X, AlertTriangle, Clock, Mail, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STATUS_COLORS = { Placed: 'badge-blue', Delivered: 'badge-green', Cancelled: 'badge-red' };

// Min date for delivery picker = today
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ReorderPage() {
  const { products, reorderHistory, addReorder, showToast } = useApp();

  const [modalProduct,   setModalProduct]   = useState(null);
  const [reorderQty,     setReorderQty]     = useState('');
  const [deliveryDate,   setDeliveryDate]   = useState('');
  const [feedback,       setFeedback]       = useState('');
  const [errors,         setErrors]         = useState({});
  const [placing,        setPlacing]        = useState(false);

  const lowStockItems = products.filter((p) => p.stock < p.reorderThreshold);

  const openModal = (product) => {
    setModalProduct(product);
    setReorderQty('');
    setDeliveryDate('');
    setFeedback('');
    setErrors({});
  };
  const closeModal = () => { if (!placing) setModalProduct(null); };

  const validate = () => {
    const e = {};
    const qty = parseInt(reorderQty, 10);
    if (!qty || qty <= 0) e.qty = 'Enter a valid quantity.';
    if (!deliveryDate)    e.deliveryDate = 'Expected delivery date is required.';
    return e;
  };

  const handleReorder = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setPlacing(true);
    try {
      const { emailSent } = await addReorder(
        modalProduct.productId,
        parseInt(reorderQty, 10),
        deliveryDate,          // ISO date string YYYY-MM-DD
        feedback.trim(),
      );

      const emailNote = emailSent
        ? 'Email sent to supplier.'
        : modalProduct.supplierEmail
          ? 'Reorder placed, but supplier email failed to send.'
          : 'Reorder placed. (No supplier email configured.)';

      showToast(`Reorder placed for ${modalProduct.name} (qty: ${reorderQty}). ${emailNote}`);
      setModalProduct(null);
    } catch (err) {
      showToast(err.message || 'Failed to place reorder.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><RefreshCw size={20}/> Reorder</h1>
        <p className="page-subtitle">
          {lowStockItems.length === 0
            ? 'All products are well-stocked — no reorders needed.'
            : `${lowStockItems.length} product${lowStockItems.length > 1 ? 's' : ''} below reorder threshold.`}
        </p>
      </div>

      {/* ── Low-stock products ─────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><AlertTriangle size={15}/> Low Stock Products</h2>
        </div>
        {lowStockItems.length === 0 ? (
          <p className="empty-msg success-msg"><CheckCircle size={14}/> No low-stock items.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>Barcode</th><th>Product</th><th>Category</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Threshold</th>
                <th>Supplier</th><th>Contact</th><th>Email</th><th></th>
              </tr></thead>
              <tbody>
                {lowStockItems.map((p) => (
                  <tr key={p.id} className="row-low-stock">
                    <td className="mono text-sm">{p.barcode}</td>
                    <td className="font-medium">{p.name}</td>
                    <td><span className="category-pill">{p.category}</span></td>
                    <td className="text-right"><span className="badge badge-red">{p.stock}</span></td>
                    <td className="text-right text-muted">{p.reorderThreshold}</td>
                    <td>{p.supplierName}</td>
                    <td className="mono text-sm">{p.supplierContact}</td>
                    <td className="text-sm">
                      {p.supplierEmail
                        ? <span className="contact-value"><Mail size={12}/> {p.supplierEmail}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => openModal(p)}>
                        <RefreshCw size={13}/> Reorder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reorder history ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><Clock size={15}/> Reorder History</h2>
        </div>
        {reorderHistory.length === 0 ? (
          <p className="empty-msg">No reorders placed yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Product</th>
                <th className="text-right">Qty</th>
                <th>Expected Delivery</th>
                <th>Supplier</th><th>Feedback</th><th>Status</th>
              </tr></thead>
              <tbody>
                {reorderHistory.map((r) => (
                  <tr key={r.id}>
                    <td className="text-sm">{r.date}</td>
                    <td className="font-medium">{r.productName}</td>
                    <td className="text-right">{r.qty}</td>
                    <td className="text-sm">{r.expectedDeliveryDate || '—'}</td>
                    <td>{r.supplierName}</td>
                    <td className="text-muted text-sm">{r.feedback || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[r.status] || 'badge-green'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reorder Modal ──────────────────────────────────────────── */}
      {modalProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-header-icon modal-header-icon--blue">
                <RefreshCw size={20}/>
              </div>
              <div className="modal-header-text">
                <h2 className="modal-title">Place Reorder</h2>
                <p className="modal-subtitle">{modalProduct.name}</p>
              </div>
              <button className="modal-close-btn" onClick={closeModal} disabled={placing}>
                <X size={18}/>
              </button>
            </div>

            <div className="modal-body">
              {/* Supplier snapshot */}
              <div className="reorder-info-grid">
                <InfoRow label="Supplier"      value={modalProduct.supplierName} />
                <InfoRow label="Contact"       value={modalProduct.supplierContact} />
                <InfoRow label="Email"         value={
                  modalProduct.supplierEmail
                    ? <span className="contact-value"><Mail size={12}/> {modalProduct.supplierEmail}</span>
                    : <span className="text-muted">Not set — email won't be sent</span>
                } />
                <InfoRow label="Current Stock" value={<span className="badge badge-red">{modalProduct.stock}</span>} />
                <InfoRow label="Threshold"     value={modalProduct.reorderThreshold} />
              </div>

              {/* Quantity */}
              <div className="form-group mt-3">
                <label className="form-label">Quantity to Reorder *</label>
                <input
                  className={`form-input ${errors.qty ? 'input-error' : ''}`}
                  type="number" min="1"
                  value={reorderQty}
                  onChange={(e) => { setReorderQty(e.target.value); setErrors((p) => ({ ...p, qty: '' })); }}
                  placeholder="Enter quantity"
                  autoFocus
                  disabled={placing}
                />
                {errors.qty && <span className="field-error">{errors.qty}</span>}
              </div>

              {/* Expected Delivery Date */}
              <div className="form-group mt-3">
                <label className="form-label">
                  <Calendar size={13}/> Expected Delivery Date *
                </label>
                <input
                  className={`form-input ${errors.deliveryDate ? 'input-error' : ''}`}
                  type="date"
                  min={todayISO()}
                  value={deliveryDate}
                  onChange={(e) => { setDeliveryDate(e.target.value); setErrors((p) => ({ ...p, deliveryDate: '' })); }}
                  disabled={placing}
                />
                {errors.deliveryDate && <span className="field-error">{errors.deliveryDate}</span>}
              </div>

              {/* Feedback */}
              <div className="form-group mt-3">
                <label className="form-label">
                  Manager's Note <span className="text-muted">(optional — included in email)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Urgent — please use rear dock entrance"
                  disabled={placing}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {modalProduct.supplierEmail && (
                <p className="text-sm" style={{ color: 'var(--color-green, #16a34a)', marginTop: 8 }}>
                  <Mail size={12}/> An automated email will be sent to{' '}
                  <strong>{modalProduct.supplierEmail}</strong>
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={placing}>
                <X size={14}/> Cancel
              </button>
              <button className="btn btn-success" onClick={handleReorder} disabled={placing}>
                {placing
                  ? <><span className="spinner-sm"/> Placing…</>
                  : <><CheckCircle size={14}/> Place Reorder</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="alert-detail-item">
      <span className="alert-detail-label">{label}</span>
      <span className="alert-detail-value">{value}</span>
    </div>
  );
}
