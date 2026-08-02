import { useState } from 'react';
import { Warehouse, Search, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SORT_OPTIONS = [
  { label: 'Name A–Z',          value: 'name-asc'   },
  { label: 'Name Z–A',          value: 'name-desc'  },
  { label: 'Stock Low–High',    value: 'stock-asc'  },
  { label: 'Stock High–Low',    value: 'stock-desc' },
  { label: 'Price Low–High',    value: 'price-asc'  },
  { label: 'Price High–Low',    value: 'price-desc' },
];

export default function Inventory() {
  const { products, showToast } = useApp();
  const [search,    setSearch]    = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [sort,      setSort]      = useState('name-asc');
  const [catFilter, setCatFilter] = useState('');

  const categories = [...new Set(products.map(p => p.category))].sort();
  const lowCount   = products.filter(p => p.stock < p.reorderThreshold).length;

  let filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q)
      || p.barcode.toLowerCase().includes(q)
      || p.supplierName.toLowerCase().includes(q);
    return matchSearch
      && (filterLow ? p.stock < p.reorderThreshold : true)
      && (catFilter ? p.category === catFilter : true);
  });

  filtered = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'name-asc':   return a.name.localeCompare(b.name);
      case 'name-desc':  return b.name.localeCompare(a.name);
      case 'stock-asc':  return a.stock - b.stock;
      case 'stock-desc': return b.stock - a.stock;
      case 'price-asc':  return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      default:           return 0;
    }
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title"><Warehouse size={20}/> Inventory</h1>
        <p className="page-subtitle">
          {products.length} products · {lowCount > 0
            ? <span className="text-red"><AlertTriangle size={13}/> {lowCount} low stock</span>
            : <span className="color-green"><CheckCircle size={13}/> All well-stocked</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="card filter-bar">
        <div className="search-wrap">
          <Search size={15} className="search-icon"/>
          <input className="form-input search-field"
            placeholder="Search by name, barcode, supplier…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input sort-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="toggle-label">
          <input type="checkbox" checked={filterLow} onChange={e => setFilterLow(e.target.checked)}/>
          Low stock only
        </label>
      </div>

      <div className="card">
        {filtered.length === 0
          ? <p className="empty-msg">No products match your filter.</p>
          : (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  <th>Barcode</th><th>Name</th><th>Category</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Threshold</th>
                  <th>Supplier</th><th>Contact</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(p => {
                    const isLow = p.stock < p.reorderThreshold;
                    return (
                      <tr key={p.id} className={isLow ? 'row-low-stock' : ''}>
                        <td className="mono text-sm">{p.barcode}</td>
                        <td className="font-medium">{p.name}</td>
                        <td><span className="category-pill">{p.category}</span></td>
                        <td className="text-right">₹{p.price.toLocaleString()}</td>
                        <td className="text-right">
                          <span className={`badge ${isLow ? 'badge-red' : 'badge-green'}`}>{p.stock}</span>
                        </td>
                        <td className="text-right text-muted">{p.reorderThreshold}</td>
                        <td>{p.supplierName}</td>
                        <td className="mono text-sm">{p.supplierContact}</td>
                        <td>
                          {isLow
                            ? <span className="status-pill status-low"><AlertTriangle size={11}/> Low</span>
                            : <span className="status-pill status-ok"><CheckCircle size={11}/> OK</span>}
                        </td>
                        <td>
                          {isLow && (
                            <button className="icon-btn text-orange" title="Notify supplier"
                              onClick={() => showToast(`Notification sent to ${p.supplierName}`)}>
                              <Bell size={15}/>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
