import { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { PackagePlus, Printer, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CATEGORIES = [
  'Grains & Pulses','Oils & Fats','Dairy','Beverages','Snacks',
  'Spices & Condiments','Sweeteners','Personal Care','Cleaning Supplies',
  'Frozen Foods','Other',
];

const EMPTY = {
  name:'', category:'', price:'', stock:'',
  supplierName:'', supplierContact:'', reorderThreshold:'5',
};

export default function AddProduct() {
  const { products, addProduct, showToast } = useApp();
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [lastAdded, setLastAdded] = useState(null);
  const barcodeRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name = 'Required.';
    if (!form.category)     e.category = 'Select a category.';
    if (!form.price || isNaN(form.price) || +form.price <= 0) e.price = 'Enter valid price.';
    if (!form.stock || isNaN(form.stock) || +form.stock < 0)  e.stock = 'Enter valid quantity.';
    if (!form.supplierName.trim()) e.supplierName = 'Required.';
    if (!form.supplierContact.trim()) e.supplierContact = 'Required.';
    else if (!/^\d{10}$/.test(form.supplierContact.trim())) e.supplierContact = '10-digit number required.';
    if (!form.reorderThreshold || isNaN(form.reorderThreshold) || +form.reorderThreshold < 0)
      e.reorderThreshold = 'Enter valid threshold.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const p = addProduct(form);
    setLastAdded(p);
    setForm(EMPTY);
    setErrors({});
    showToast(`"${p.name}" added with barcode ${p.barcode}`);
  };

  const handlePrint = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (!svg) return;
    const win = window.open('','_blank');
    win.document.write(`<html><head><title>Barcode ${lastAdded.barcode}</title></head>
      <body style="text-align:center;padding:40px;font-family:sans-serif">
        <h3>${lastAdded.name}</h3>${new XMLSerializer().serializeToString(svg)}
        <p style="margin-top:8px">${lastAdded.barcode}</p>
        <script>window.onload=()=>window.print()<\/script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><PackagePlus size={20}/> Add Product</h1>
        <p className="page-subtitle">Add a new product to inventory — a barcode is generated automatically.</p>
      </div>

      <div className="add-product-layout">
        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <Field label="Product Name *" error={errors.name} full>
                <input className={`form-input ${errors.name?'input-error':''}`}
                  name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Basmati Rice (5kg)" />
              </Field>
              <Field label="Category *" error={errors.category}>
                <select className={`form-input ${errors.category?'input-error':''}`}
                  name="category" value={form.category} onChange={handleChange}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Price (₹) *" error={errors.price}>
                <input className={`form-input ${errors.price?'input-error':''}`}
                  name="price" type="number" min="0" step="0.01"
                  value={form.price} onChange={handleChange} placeholder="0.00" />
              </Field>
              <Field label="Initial Stock (qty) *" error={errors.stock}>
                <input className={`form-input ${errors.stock?'input-error':''}`}
                  name="stock" type="number" min="0"
                  value={form.stock} onChange={handleChange} placeholder="0" />
              </Field>
              <Field label="Supplier Name *" error={errors.supplierName}>
                <input className={`form-input ${errors.supplierName?'input-error':''}`}
                  name="supplierName" value={form.supplierName} onChange={handleChange}
                  placeholder="e.g. Agro Traders" />
              </Field>
              <Field label="Supplier Contact *" error={errors.supplierContact}>
                <input className={`form-input ${errors.supplierContact?'input-error':''}`}
                  name="supplierContact" value={form.supplierContact} onChange={handleChange}
                  placeholder="10-digit number" maxLength={10} />
              </Field>
              <Field label="Reorder Threshold" error={errors.reorderThreshold}>
                <input className={`form-input ${errors.reorderThreshold?'input-error':''}`}
                  name="reorderThreshold" type="number" min="0"
                  value={form.reorderThreshold} onChange={handleChange} />
              </Field>
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              <PackagePlus size={16}/> Add Product &amp; Generate Barcode
            </button>
          </form>
        </div>

        {/* Barcode result */}
        {lastAdded && (
          <div className="card barcode-card" ref={barcodeRef}>
            <div className="barcode-success-header">
              <CheckCircle size={18} className="color-green"/>
              <span className="card-title">Barcode Generated</span>
            </div>
            <p className="barcode-product-name">{lastAdded.name}</p>
            <div className="barcode-img-wrap">
              <Barcode value={lastAdded.barcode} width={2} height={72} fontSize={13} background="#fff"/>
            </div>
            <p className="barcode-text">Code: <strong>{lastAdded.barcode}</strong></p>
            <div className="barcode-meta">
              <span>Category: {lastAdded.category}</span>
              <span>₹{lastAdded.price}</span>
              <span>Qty: {lastAdded.stock}</span>
            </div>
            <button className="btn btn-outline" onClick={handlePrint}>
              <Printer size={14}/> Print Barcode
            </button>
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Product List ({products.length})</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              <th>Barcode</th><th>Name</th><th>Category</th>
              <th className="text-right">Price</th>
              <th className="text-right">Stock</th>
              <th>Supplier</th>
            </tr></thead>
            <tbody>
              {products.map(p=>(
                <tr key={p.id} className={p.stock < p.reorderThreshold ? 'row-low-stock' : ''}>
                  <td className="mono">{p.barcode}</td>
                  <td className="font-medium">{p.name}</td>
                  <td><span className="category-pill">{p.category}</span></td>
                  <td className="text-right">₹{p.price.toLocaleString()}</td>
                  <td className="text-right">
                    <span className={`badge ${p.stock < p.reorderThreshold ? 'badge-red' : 'badge-green'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="text-muted">{p.supplierName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, full, children }) {
  return (
    <div className={`form-group${full ? ' form-group--full' : ''}`}>
      <label className="form-label">{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
