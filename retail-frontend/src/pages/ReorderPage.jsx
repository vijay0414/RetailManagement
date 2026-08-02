import { useState } from 'react';
import { RefreshCw, CheckCircle, X, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STATUS_COLORS = { Placed: 'badge-blue', Delivered: 'badge-green', Cancelled: 'badge-red' };

export default function ReorderPage() {
  const { products, reorderHistory, addReorder, showToast } = useApp();
  const [modalProduct, setModalProduct] = useState(null);
  const [reorderQty, setReorderQty]     = useState('');
  const [qtyError, setQtyError]         = useState('');

  const lowStockItems = products.filter(p => p.stock < p.reorderThreshold);

  const openModal = (product) => {
    setModalProduct(product);
    setReorderQty('');
    setQtyError('');
  };
  const closeModal = () => setModalProduct(null);

  const handleReorder = () => {
    const qty = parseInt(reorderQty, 10);
    if (!qty || qty <= 0) { setQtyError('Enter a valid quantity.'); return; }
    const entry = {
      id: Date.now(),
      barcode: modalProduct.barcode,
      productName: modalProduct.name,
      supplierName: modalProduct.supplierName,
      supplierContact: modalProduct.supplierContact,
      qty,
      date: new Date().toLocaleString('en-IN', {
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', hour12:true,
      }),
      status: 'Placed',
    };
    addReorder(entry);
    showToast(`Reorder placed with ${modalProduct.supplierName} for ${modalProduct.name} (qty: ${qty})`);
    closeModal();
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

      {/* Low-stock products */}
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
                <th className="text-right">Current Stock</th>
                <th className="text-right">Threshold</th>
                <th>Supplier</th><th>Contact</th><th></th>
              </tr></thead>
              <tbody>
                {lowStockItems.map(p => (
                  <tr key={p.id} className="row-low-stock">
                    <td className="mono text-sm">{p.barcode}</td>
                    <td className="font-medium">{p.name}</td>
                    <td><span className="category-pill">{p.category}</span></td>
                    <td className="text-right"><span className="badge badge-red">{p.stock}</span></td>
                    <td className="text-right text-muted">{p.reorderThreshold}</td>
                    <td>{p.supplierName}</td>
                    <td className="mono text-sm">{p.supplierContact}</td>
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

      {/* Reorder history */}
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
                <th>Supplier</th><th>Status</th>
              </tr></thead>
              <tbody>
                {reorderHistory.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm">{r.date}</td>
                    <td className="font-medium">{r.productName}</td>
                    <td className="text-right">{r.qty}</td>
                    <td>{r.supplierName}</td>
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

      {/* Reorder Modal */}
      {modalProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-header-icon modal-header-icon--blue">
                <RefreshCw size={20}/>
              </div>
              <div className="modal-header-text">
                <h2 className="modal-title">Confirm Reorder</h2>
                <p className="modal-subtitle">{modalProduct.name}</p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="reorder-info-grid">
                <InfoRow label="Supplier"       value={modalProduct.supplierName} />
                <InfoRow label="Contact"        value={modalProduct.supplierContact} />
                <InfoRow label="Current Stock"  value={<span className="badge badge-red">{modalProduct.stock}</span>} />
                <InfoRow label="Threshold"      value={modalProduct.reorderThreshold} />
              </div>
              <div className="form-group mt-3">
                <label className="form-label">Reorder Quantity *</label>
                <input
                  className={`form-input ${qtyError ? 'input-error' : ''}`}
                  type="number" min="1"
                  value={reorderQty}
                  onChange={e => { setReorderQty(e.target.value); setQtyError(''); }}
                  placeholder="Enter quantity to order"
                  autoFocus
                />
                {qtyError && <span className="field-error">{qtyError}</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}><X size={14}/> Cancel</button>
              <button className="btn btn-success" onClick={handleReorder}>
                <CheckCircle size={14}/> Place Reorder
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
